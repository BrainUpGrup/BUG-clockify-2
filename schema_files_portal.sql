-- ==============================================================================
-- BRAIN UP GRUP (IAIAHUB) - ESQUEMA DE ÁREA TRABAJADOR & ÁREA CLIENTE AISLADA
-- ==============================================================================
-- Arquitectura Zero-Leak:
--   1. Tablas internas (internal_work_files, internal_file_versions) separadas
--      físicamente de las tablas visibles al cliente (client_deliverables, client_briefings).
--   2. Acceso de cliente híbrido: Enlace único (portal_token) + PIN cifrado (pin_hash).
--   3. Trazabilidad de versiones, motivos de rechazo y notificaciones en tiempo real.
--   4. Compatible con modo Simulador Local y Google Workspace Shared Drive API.
--
-- Ejecutar en Supabase SQL Editor cuando se pase de Simulador a Base Real.
-- ==============================================================================

create extension if not exists "pgcrypto";

-- Asegurar compatibilidad de columna logo_url en companies
alter table public.companies add column if not exists logo_url text null;

-- ------------------------------------------------------------------------------
-- 1. ACCESOS DEL PORTAL CLIENTE (Token Único + PIN Protegido)
-- ------------------------------------------------------------------------------
create table if not exists public.client_portal_access (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  portal_token text not null unique,
  pin_hash text not null,
  is_enabled boolean not null default true,
  failed_attempts integer not null default 0,
  locked_until timestamptz null,
  last_access_at timestamptz null,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_client_portal_token on public.client_portal_access(portal_token);
create index if not exists idx_client_portal_company on public.client_portal_access(company_id);

alter table public.client_portal_access enable row level security;
-- Nunca exponer pin_hash a usuarios anónimos; solo coordinadores/admins gestionan accesos
revoke all on public.client_portal_access from anon;
drop policy if exists "portal_access_coordinator_all" on public.client_portal_access;
create policy "portal_access_coordinator_all" on public.client_portal_access
  for all
  to authenticated
  using (public.is_coordinator_or_admin())
  with check (public.is_coordinator_or_admin());


-- ------------------------------------------------------------------------------
-- 2. ÁREA INTERNA DE TRABAJADORES: ARCHIVOS DE PRODUCCIÓN Y VALIDACIÓN
-- ------------------------------------------------------------------------------
create table if not exists public.internal_work_files (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  uploaded_by_name text not null,
  title text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  storage_provider text not null default 'simulator' check (storage_provider in ('simulator', 'google_drive')),
  drive_file_id text not null,
  drive_folder_path text not null,
  current_version integer not null default 1 check (current_version >= 1),
  status text not null default 'pending_review' check (status in ('pending_review', 'changes_requested', 'validated')),
  is_client_published boolean not null default false,
  worker_note text null,
  review_reason text null,
  reviewed_by uuid null references public.profiles(id) on delete set null,
  reviewed_by_name text null,
  reviewed_at timestamptz null,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_internal_files_company on public.internal_work_files(company_id);
create index if not exists idx_internal_files_uploader on public.internal_work_files(uploaded_by);
create index if not exists idx_internal_files_status on public.internal_work_files(status);

alter table public.internal_work_files enable row level security;
revoke all on public.internal_work_files from anon;

drop policy if exists "internal_files_team_select" on public.internal_work_files;
create policy "internal_files_team_select" on public.internal_work_files
  for select
  to authenticated
  using (
    public.is_coordinator_or_admin()
    or uploaded_by = auth.uid()
    or status = 'validated'
  );

drop policy if exists "internal_files_worker_insert" on public.internal_work_files;
create policy "internal_files_worker_insert" on public.internal_work_files
  for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and status = 'pending_review'
    and is_client_published = false
  );

drop policy if exists "internal_files_update_policy" on public.internal_work_files;
create policy "internal_files_update_policy" on public.internal_work_files
  for update
  to authenticated
  using (public.is_coordinator_or_admin() or uploaded_by = auth.uid())
  with check (
    public.is_coordinator_or_admin()
    or (
      uploaded_by = auth.uid()
      and status = 'pending_review'
      and is_client_published = false
    )
  );

drop policy if exists "internal_files_delete_policy" on public.internal_work_files;
create policy "internal_files_delete_policy" on public.internal_work_files
  for delete
  to authenticated
  using (public.is_coordinator_or_admin() or (uploaded_by = auth.uid() and status <> 'validated'));


-- ------------------------------------------------------------------------------
-- 3. HISTORIAL DE VERSIONES INTERNAS (v1, v2, v3...)
-- ------------------------------------------------------------------------------
create table if not exists public.internal_file_versions (
  id uuid primary key default gen_random_uuid(),
  work_file_id uuid not null references public.internal_work_files(id) on delete cascade,
  version_number integer not null check (version_number >= 1),
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  drive_file_id text not null,
  drive_folder_path text not null,
  change_note text null,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  uploaded_by_name text not null,
  created_at timestamptz not null default now(),
  unique (work_file_id, version_number)
);

create index if not exists idx_file_versions_parent on public.internal_file_versions(work_file_id);

alter table public.internal_file_versions enable row level security;
revoke all on public.internal_file_versions from anon;

drop policy if exists "internal_versions_team_all" on public.internal_file_versions;
create policy "internal_versions_team_all" on public.internal_file_versions
  for all
  to authenticated
  using (
    public.is_coordinator_or_admin()
    or exists (
      select 1 from public.internal_work_files f
      where f.id = internal_file_versions.work_file_id
        and (f.uploaded_by = auth.uid() or f.status = 'validated')
    )
  )
  with check (
    public.is_coordinator_or_admin()
    or uploaded_by = auth.uid()
  );


-- ------------------------------------------------------------------------------
-- 4. ÁREA CLIENTE SUB-ZONA 1: ENTREGABLES PUBLICADOS AL CLIENTE (TABLA ESTANCA)
-- ------------------------------------------------------------------------------
create table if not exists public.client_deliverables (
  id uuid primary key default gen_random_uuid(),
  source_work_file_id uuid not null unique references public.internal_work_files(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  version_number integer not null default 1,
  storage_provider text not null default 'simulator' check (storage_provider in ('simulator', 'google_drive')),
  drive_file_id text not null,
  drive_folder_path text not null,
  published_by uuid null references public.profiles(id) on delete set null,
  published_by_name text null,
  client_feedback_status text not null default 'pending' check (client_feedback_status in ('pending', 'approved', 'adjustment_requested')),
  client_feedback_note text null,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_client_deliverables_company on public.client_deliverables(company_id);

alter table public.client_deliverables enable row level security;
-- El acceso público directo a la tabla queda bloqueado; el portal cliente consulta vía RPC/API con token + PIN
revoke all on public.client_deliverables from anon;

drop policy if exists "client_deliverables_team_select" on public.client_deliverables;
create policy "client_deliverables_team_select" on public.client_deliverables
  for select
  to authenticated
  using (true);

drop policy if exists "client_deliverables_coord_write" on public.client_deliverables;
create policy "client_deliverables_coord_write" on public.client_deliverables
  for all
  to authenticated
  using (public.is_coordinator_or_admin())
  with check (public.is_coordinator_or_admin());


-- ------------------------------------------------------------------------------
-- 5. ÁREA CLIENTE SUB-ZONA 2: BRIEFINGS Y MATERIAL SUBIDO POR EL CLIENTE
-- ------------------------------------------------------------------------------
create table if not exists public.client_briefings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  description text null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  storage_provider text not null default 'simulator' check (storage_provider in ('simulator', 'google_drive')),
  drive_file_id text not null,
  drive_folder_path text not null,
  uploaded_by_contact text not null default 'Cliente',
  status text not null default 'new' check (status in ('new', 'reviewed', 'archived')),
  reviewed_by uuid null references public.profiles(id) on delete set null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_client_briefings_company on public.client_briefings(company_id);
create index if not exists idx_client_briefings_status on public.client_briefings(status);

alter table public.client_briefings enable row level security;
revoke all on public.client_briefings from anon;

drop policy if exists "client_briefings_team_select" on public.client_briefings;
create policy "client_briefings_team_select" on public.client_briefings
  for select
  to authenticated
  using (true);

drop policy if exists "client_briefings_coord_update" on public.client_briefings;
create policy "client_briefings_coord_update" on public.client_briefings
  for update
  to authenticated
  using (public.is_coordinator_or_admin())
  with check (public.is_coordinator_or_admin());


-- ------------------------------------------------------------------------------
-- 6. NOTIFICACIONES EN TIEMPO REAL DE FLUJOS DE ARCHIVOS
-- ------------------------------------------------------------------------------
create table if not exists public.file_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid null references public.profiles(id) on delete cascade,
  recipient_role text null check (recipient_role in ('admin', 'coordinator', 'employee')),
  company_id uuid null references public.companies(id) on delete cascade,
  work_file_id uuid null references public.internal_work_files(id) on delete cascade,
  briefing_id uuid null references public.client_briefings(id) on delete cascade,
  type text not null check (type in (
    'file_changes_requested',
    'file_validated',
    'file_published',
    'new_worker_upload',
    'new_client_briefing',
    'client_feedback'
  )),
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_file_notifications_user on public.file_notifications(recipient_user_id, is_read);
create index if not exists idx_file_notifications_role on public.file_notifications(recipient_role, is_read);

alter table public.file_notifications enable row level security;
revoke all on public.file_notifications from anon;

drop policy if exists "file_notifications_select" on public.file_notifications;
create policy "file_notifications_select" on public.file_notifications
  for select
  to authenticated
  using (
    recipient_user_id = auth.uid()
    or (public.is_coordinator_or_admin() and recipient_role in ('coordinator', 'admin'))
  );

drop policy if exists "file_notifications_update" on public.file_notifications;
create policy "file_notifications_update" on public.file_notifications
  for update
  to authenticated
  using (
    recipient_user_id = auth.uid()
    or (public.is_coordinator_or_admin() and recipient_role in ('coordinator', 'admin'))
  );

drop policy if exists "file_notifications_insert" on public.file_notifications;
create policy "file_notifications_insert" on public.file_notifications
  for insert
  to authenticated
  with check (true);


-- ------------------------------------------------------------------------------
-- 7. FUNCIONES RPC SECURITY DEFINER PARA EL PORTAL CLIENTE (CERO FUGAS DE DATOS)
-- ------------------------------------------------------------------------------

-- A) Verificar PIN del portal cliente con protección anti-fuerza bruta (máx 5 fallos -> bloqueo 15m)
create or replace function public.verify_client_portal_pin(p_token text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_access record;
  v_company record;
begin
  select * into v_access
  from public.client_portal_access
  where portal_token = trim(p_token);

  if not found or not v_access.is_enabled then
    return jsonb_build_object('ok', false, 'error', 'Enlace no válido o desactivado por la agencia.');
  end if;

  if v_access.locked_until is not null and v_access.locked_until > now() then
    return jsonb_build_object('ok', false, 'error', 'Demasiados intentos fallidos. Inténtalo en unos minutos.');
  end if;

  if v_access.pin_hash = crypt(trim(p_pin), v_access.pin_hash) then
    update public.client_portal_access
    set failed_attempts = 0, locked_until = null, last_access_at = now(), updated_at = now()
    where id = v_access.id;

    select id, name, logo_url into v_company
    from public.companies
    where id = v_access.company_id;

    return jsonb_build_object(
      'ok', true,
      'company_id', v_company.id,
      'company_name', v_company.name,
      'company_logo', v_company.logo_url
    );
  else
    update public.client_portal_access
    set failed_attempts = failed_attempts + 1,
        locked_until = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' else null end,
        updated_at = now()
    where id = v_access.id;

    return jsonb_build_object('ok', false, 'error', 'Código PIN incorrecto.');
  end if;
end;
$$;

-- B) Obtener instantánea segura del Área Cliente (jamás consulta internal_work_files)
create or replace function public.get_client_portal_snapshot(p_company_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deliverables jsonb;
  v_briefings jsonb;
begin
  select coalesce(jsonb_agg(row_to_json(d) order by d.published_at desc), '[]'::jsonb)
  into v_deliverables
  from (
    select id, title, file_name, mime_type, size_bytes, version_number,
           client_feedback_status, client_feedback_note, published_at
    from public.client_deliverables
    where company_id = p_company_id
  ) d;

  select coalesce(jsonb_agg(row_to_json(b) order by b.created_at desc), '[]'::jsonb)
  into v_briefings
  from (
    select id, title, description, file_name, mime_type, size_bytes,
           uploaded_by_contact, status, created_at
    from public.client_briefings
    where company_id = p_company_id
  ) b;

  return jsonb_build_object(
    'deliverables', v_deliverables,
    'briefings', v_briefings
  );
end;
$$;

-- Habilitar Realtime para notificaciones si la publicación existe
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.file_notifications;
    exception when duplicate_object then
      null;
    end;
  end if;
end $$;
