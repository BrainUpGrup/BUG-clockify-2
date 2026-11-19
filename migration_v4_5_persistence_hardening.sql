-- ==============================================================================
-- MIGRACIÓN v4.5.0: PERSISTENCIA EN SUPABASE Y BLINDAJE DE SESIÓN • BRAIN UP HUB
-- Suite Corporativa: Brain Up Grup
-- Idempotente y segura (se puede ejecutar varias veces sin pérdida de datos)
--
-- QUÉ CREA:
--   1. `public.user_hub_preferences`: permisos reales de apps del Hub por usuario
--      (gestionados por Coordinación/Admin y validados en servidor) + favoritas.
--   2. `public.user_notifications`: centro de notificaciones sincronizado entre
--      dispositivos por usuario.
--   3. `public.login_rate_limits`: limitador persistente de intentos fallidos de
--      login compatible con Vercel serverless (reemplaza el Map en memoria RAM).
--
-- NOTA DE SEGURIDAD:
--   Las 3 tablas nacen ya bajo política Zero-Trust RLS (solo accesibles desde
--   Route Handlers de servidor con `SUPABASE_SERVICE_ROLE_KEY`).
-- ==============================================================================

-- 1. PREFERENCIAS Y PERMISOS DE APPS DEL HUB POR USUARIO
create table if not exists public.user_hub_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  allowed_apps jsonb null,
  favorite_apps jsonb null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_hub_preferences_updated_at
  on public.user_hub_preferences (updated_at desc);

-- 2. CENTRO DE NOTIFICACIONES INTERNAS POR USUARIO
create table if not exists public.user_notifications (
  id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  source text not null default 'system' check (source in ('postit', 'taskflow', 'clockify', 'system')),
  date timestamptz not null default now(),
  read boolean not null default false,
  urgency text null default 'normal' check (urgency in ('normal', 'alta', 'info')),
  related_id text null,
  reminder_label text null,
  target_date text null,
  link text null,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists idx_user_notifications_user_date
  on public.user_notifications (user_id, date desc);

-- 3. RATE LIMIT PERSISTENTE PARA INTENTOS DE LOGIN (ANTI FUERZA BRUTA)
create table if not exists public.login_rate_limits (
  rate_key text primary key,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_login_rate_limits_window
  on public.login_rate_limits (window_started_at);

-- 4. BLINDAJE ZERO-TRUST RLS INMEDIATO PARA LAS 3 NUEVAS TABLAS
do $$
declare
  new_tables text[] := array[
    'user_hub_preferences',
    'user_notifications',
    'login_rate_limits'
  ];
  tbl text;
  pol record;
begin
  foreach tbl in array new_tables
  loop
    for pol in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = tbl
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, tbl);
    end loop;

    execute format('alter table public.%I enable row level security', tbl);
    execute format(
      'create policy %I on public.%I for all using (false) with check (false)',
      tbl || '_zero_trust_server_only',
      tbl
    );
    execute format('revoke all on table public.%I from anon, authenticated', tbl);
    execute format('grant all on table public.%I to service_role', tbl);
  end loop;
end $$;
