-- ==============================================================================
-- MIGRACIÓN ZERO-TRUST RLS PARA DATOS SENSIBLES • BRAIN UP CLOCKIFY
-- Suite Corporativa: Brain Up Grup
-- Versión asociada: v4.5.0
--
-- IMPORTANTE — PRERREQUISITO ANTES DE EJECUTAR ESTE SCRIPT:
--   1. Añade `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` (desarrollo) y en
--      Vercel -> Settings -> Environment Variables (producción).
--   2. Ejecuta primero `migration_v4_5_persistence_hardening.sql` en Supabase.
--   3. Despliega/reinicia la aplicación Next.js con las rutas `/api/data/*`.
--   4. SOLO ENTONCES ejecuta este SQL en el SQL Editor de Supabase.
--
-- POR QUÉ:
--   Todas las lecturas y escrituras de perfiles, empresas, horas, hosting,
--   TaskFlow, Brain Chat, auditoría, preferencias del Hub, notificaciones y
--   rate limits ya pasan por API Routes del servidor autenticadas con HMAC
--   (`requireActiveUser` + `requireHubAppAccess`).
--   Al cerrar el acceso directo `anon` / `authenticated` mediante RLS, nadie podrá
--   leer ni modificar datos desde la consola del navegador con la `anon key`.
--   Las funciones RPC con `SECURITY DEFINER` (`authenticate_employee`,
--   `admin_set_user_password`, `log_audit_event`) y las operaciones de servidor
--   con `service_role` siguen operando con total normalidad.
-- ==============================================================================

do $$
declare
  target_tables text[] := array[
    'profiles',
    'companies',
    'time_entries',
    'hosting_services',
    'taskflow_items',
    'taskflow_lists',
    'taskflow_postits',
    'profile_passwords',
    'channels',
    'channel_members',
    'messages',
    'audit_logs',
    'user_hub_preferences',
    'user_notifications',
    'login_rate_limits'
  ];
  tbl text;
  pol record;
begin
  foreach tbl in array target_tables
  loop
    if to_regclass('public.' || tbl) is not null then
      -- 1. Eliminar políticas permisivas previas sobre la tabla
      for pol in
        select policyname
        from pg_policies
        where schemaname = 'public'
          and tablename = tbl
      loop
        execute format('drop policy if exists %I on public.%I', pol.policyname, tbl);
      end loop;

      -- 2. Activar RLS y denegar acceso REST directo (solo service_role / SECURITY DEFINER)
      execute format('alter table public.%I enable row level security', tbl);
      execute format(
        'create policy %I on public.%I for all using (false) with check (false)',
        tbl || '_zero_trust_server_only',
        tbl
      );

      -- 3. Revocar permisos directos de tablas a clientes anónimos/autenticados REST
      execute format('revoke all on table public.%I from anon, authenticated', tbl);
      execute format('grant all on table public.%I to service_role', tbl);
    end if;
  end loop;
end $$;

-- Verificación rápida tras ejecutar (todas las tablas existentes deben mostrar rowsecurity = true):
-- select tablename, rowsecurity
-- from pg_tables
-- where schemaname = 'public'
--   and tablename in (
--     'profiles', 'companies', 'time_entries', 'hosting_services',
--     'taskflow_items', 'taskflow_lists', 'taskflow_postits', 'profile_passwords',
--     'channels', 'channel_members', 'messages', 'audit_logs',
--     'user_hub_preferences', 'user_notifications', 'login_rate_limits'
--   )
-- order by tablename;
