-- ==============================================================================
-- BRAIN UP GRUP - ESQUEMA DE BASE DE DATOS COMPLETO PARA SUPABASE
-- Sistema: BUG Clockify (Control Horario y Cuotas por Empresa)
-- ==============================================================================
-- Copia y pega todo este script en el SQL Editor de tu proyecto Supabase y pulsa RUN.
-- ==============================================================================

create extension if not exists "pgcrypto";

-- 1. TABLA: profiles (Perfiles de usuario y miembros del equipo)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'coordinator', 'employee')) default 'employee',
  status text not null check (status in ('active', 'pending', 'rejected')) default 'active',
  department text null default 'Creatividad & Operaciones',
  avatar_url text null default null,
  password_configured boolean not null default true,
  temp_password text null,
  created_at timestamptz not null default now()
);

-- Migración segura por si la tabla ya existía:
alter table public.profiles add column if not exists password_configured boolean not null default true;
alter table public.profiles add column if not exists temp_password text null;
alter table public.profiles add column if not exists custom_password text null;

-- 2. TABLA: companies (Empresas / Clientes con Cuota y Ficha Detallada)
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_type text not null default 'cuota' check (client_type in ('cuota', 'puntual')),
  monthly_hours_quota numeric(6, 2) null default 15,
  cif text null,
  contact_name text null,
  contact_email text null,
  account_manager text null default 'Alejandro Ramos',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. TABLA: time_entries (Registros horarios clasificados por Empresa y Tipo de Cómputo)
create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  work_date date not null default current_date,
  start_time timestamptz null,
  end_time timestamptz null,
  duration_minutes integer not null check (duration_minutes >= 0),
  description text null,
  compute_type text not null default 'cuota' check (compute_type in ('cuota', 'puntual')),
  created_at timestamptz not null default now()
);

-- ÍNDICES DE RENDIMIENTO
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_status on public.profiles(status);
create index if not exists idx_time_entries_user_date on public.time_entries(user_id, work_date);
create index if not exists idx_time_entries_company on public.time_entries(company_id);
create index if not exists idx_time_entries_date on public.time_entries(work_date);

-- FUNCIONES DE SEGURIDAD (Evita recursión infinita en RLS)
create or replace function public.is_coordinator()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'coordinator'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.is_coordinator_or_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('coordinator', 'admin')
  );
$$;

-- FUNCIÓN RPC PARA AUTENTICACIÓN SEGURA DE EMPLEADOS (SIN EXPONER LA COLUMNA custom_password)
create or replace function public.authenticate_employee(p_email text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prof record;
begin
  if p_email is null or p_password is null or trim(p_email) = '' or trim(p_password) = '' then
    return jsonb_build_object('success', false, 'error', 'El correo y la contraseña son obligatorios.');
  end if;

  select id, full_name, email, role, status, department, avatar_url, password_configured, created_at
  into v_prof
  from public.profiles
  where lower(trim(email)) = lower(trim(p_email))
    and (custom_password = trim(p_password) or temp_password = trim(p_password));

  if not found then
    return jsonb_build_object('success', false, 'error', 'Credenciales incorrectas.');
  end if;

  if v_prof.status = 'pending' then
    return jsonb_build_object(
      'success', false, 
      'error', 'Tu cuenta está registrada pero aún está PENDIENTE de validación y aceptación por la coordinadora.'
    );
  end if;

  if v_prof.status = 'rejected' then
    return jsonb_build_object(
      'success', false, 
      'error', 'Tu solicitud de acceso fue rechazada. Contacta con la coordinadora.'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', v_prof.id,
      'full_name', v_prof.full_name,
      'email', v_prof.email,
      'role', v_prof.role,
      'status', v_prof.status,
      'department', v_prof.department,
      'avatar_url', v_prof.avatar_url,
      'password_configured', v_prof.password_configured,
      'created_at', v_prof.created_at
    )
  );
end;
$$;

grant execute on function public.authenticate_employee(text, text) to anon, authenticated;

-- TRIGGER: Sincronización automática de nuevos usuarios registrados vía auth.users -> profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_dept text;
begin
  v_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );
  
  v_dept := coalesce(new.raw_user_meta_data->>'department', 'Creatividad & Operaciones');

  -- MEDIDA DE SEGURIDAD CRÍTICA (VULN-01):
  -- Todo registro público entra siempre como 'employee' y en estado 'pending'.
  -- Se prohíbe explícitamente confiar en raw_user_meta_data->>'role' para evitar
  -- que usuarios no autorizados se auto-asignen rol 'admin' o 'coordinator'.
  -- Solo un administrador o coordinador puede activar la cuenta y ascender el rol.
  insert into public.profiles (id, full_name, email, role, status, department, created_at)
  values (new.id, v_full_name, new.email, 'employee', 'pending', v_dept, now())
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- HABILITAR ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.time_entries enable row level security;

-- ==============================================================================
-- POLÍTICAS RLS: profiles
-- ==============================================================================
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_select_policy" on public.profiles;
create policy "profiles_select_policy" on public.profiles
  for select using (
    auth.uid() = id or public.is_coordinator_or_admin()
  );

-- TRIGGER DE SEGURIDAD: Bloquear escalada de privilegios en perfiles
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo coordinadores o administradores pueden crear o cambiar roles/estados privilegiados
  if not public.is_coordinator_or_admin() then
    if TG_OP = 'INSERT' then
      if new.role is distinct from 'employee' or new.status is distinct from 'pending' then
        raise exception 'Operación denegada: los nuevos perfiles solo pueden registrarse como empleado en estado pendiente.';
      end if;
    elsif TG_OP = 'UPDATE' then
      if new.role is distinct from old.role or new.status is distinct from old.status then
        raise exception 'Operación denegada: no tienes permisos para modificar el rol o el estado de la cuenta.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_protect_profile_privileges on public.profiles;
create trigger tr_protect_profile_privileges
  before insert or update on public.profiles
  for each row execute function public.protect_profile_privileges();

drop policy if exists "profiles_insert_registration" on public.profiles;
create policy "profiles_insert_registration" on public.profiles
  for insert with check (
    -- Un usuario solo puede insertar su propio perfil autenticado o ser insertado por un coordinador/admin
    auth.uid() = id or public.is_coordinator_or_admin()
  );

drop policy if exists "profiles_update_self_or_coordinator" on public.profiles;
drop policy if exists "profiles_update_policy" on public.profiles;
create policy "profiles_update_policy" on public.profiles
  for update using (
    auth.uid() = id or public.is_coordinator_or_admin()
  )
  with check (
    -- Un usuario solo puede actualizar su propio registro conservando su rol y estado, salvo coordinador/admin
    (auth.uid() = id and role = (select p.role from public.profiles p where p.id = auth.uid()) and status = (select p.status from public.profiles p where p.id = auth.uid()))
    or public.is_coordinator_or_admin()
  );

drop policy if exists "profiles_delete_coordinator" on public.profiles;
drop policy if exists "profiles_delete_policy" on public.profiles;
create policy "profiles_delete_policy" on public.profiles
  for delete using (
    public.is_coordinator_or_admin()
  );

-- ==============================================================================
-- POLÍTICAS RLS: companies
-- ==============================================================================
drop policy if exists "companies_select_policy" on public.companies;
create policy "companies_select_policy" on public.companies
  for select using (
    -- Solo usuarios autenticados con cuenta activa o coordinadores pueden consultar empresas
    auth.uid() is not null and exists (
      select 1 from public.profiles
      where id = auth.uid() and status = 'active'
    )
  );

drop policy if exists "companies_insert_policy" on public.companies;
create policy "companies_insert_policy" on public.companies
  for insert with check (
    public.is_coordinator()
  );

drop policy if exists "companies_update_policy" on public.companies;
create policy "companies_update_policy" on public.companies
  for update using (
    public.is_coordinator()
  );

drop policy if exists "companies_delete_policy" on public.companies;
create policy "companies_delete_policy" on public.companies
  for delete using (
    public.is_coordinator()
  );

-- ==============================================================================
-- POLÍTICAS RLS: time_entries (AISLAMIENTO TOTAL DE DATOS POR USUARIO)
-- ==============================================================================
-- Un empleado ÚNICAMENTE puede consultar sus propias horas registradas.
-- La coordinadora puede consultar las de todo el equipo para control de cuotas e informes.
drop policy if exists "time_entries_select_policy" on public.time_entries;
create policy "time_entries_select_policy" on public.time_entries
  for select using (
    auth.uid() = user_id or public.is_coordinator()
  );

-- Un empleado solo puede insertar registros a su propio nombre (user_id = auth.uid())
drop policy if exists "time_entries_insert_policy" on public.time_entries;
create policy "time_entries_insert_policy" on public.time_entries
  for insert with check (
    auth.uid() = user_id or public.is_coordinator()
  );

-- Solo el autor o la coordinadora pueden modificar registros
drop policy if exists "time_entries_update_policy" on public.time_entries;
create policy "time_entries_update_policy" on public.time_entries
  for update using (
    auth.uid() = user_id or public.is_coordinator()
  );

-- Solo el autor o la coordinadora pueden eliminar registros
drop policy if exists "time_entries_delete_policy" on public.time_entries;
create policy "time_entries_delete_policy" on public.time_entries
  for delete using (
    auth.uid() = user_id or public.is_coordinator()
  );

-- ==============================================================================
-- CUENTAS INICIALES DE PRUEBA Y PRODUCCIÓN (Brain Up Grup)
-- ==============================================================================
-- 1. Super Administrador Maestro
insert into public.profiles (id, full_name, email, role, status, department, avatar_url, created_at)
values (
  '00000000-0000-0000-0000-000000000001',
  'Super Administrador',
  'appadmin@brainupgrup.com',
  'admin',
  'active',
  'Sistemas & Seguridad',
  null,
  now()
)
on conflict (email) do update
set
  role = 'admin',
  status = 'active',
  full_name = 'Super Administrador',
  department = 'Sistemas & Seguridad';

-- 2. Coordinación Brain Up (Rol Dual: Coordinadora & Empleada)
insert into public.profiles (id, full_name, email, role, status, department, avatar_url, created_at)
values (
  '00000000-0000-0000-0000-000000000002',
  'Coordinación Brain Up',
  'coordinacion@brainupgrup.com',
  'coordinator',
  'active',
  'Dirección de Operaciones',
  null,
  now()
)
on conflict (email) do update
set
  role = 'coordinator',
  status = 'active',
  full_name = 'Coordinación Brain Up',
  department = 'Dirección de Operaciones';

-- 3. Empleado de Prueba (Vista de Trabajador)
insert into public.profiles (id, full_name, email, role, status, department, avatar_url, created_at)
values (
  '00000000-0000-0000-0000-000000000003',
  'Empleado de Prueba',
  'empleado@brainupgrup.com',
  'employee',
  'active',
  'Creatividad & Operaciones',
  null,
  now()
)
on conflict (email) do update
set
  role = 'employee',
  status = 'active',
  full_name = 'Empleado de Prueba',
  department = 'Creatividad & Operaciones';

-- ==============================================================================
-- SISTEMA LISTO PARA PRODUCCIÓN (Base de datos limpia)
-- Las empresas y clientes se darán de alta por la coordinadora desde el panel.
-- ==============================================================================

-- 4. TABLA: hosting_services (Servicios de Hosting, Dominios y Alertas de Renovación)
create table if not exists public.hosting_services (
  id text primary key,
  name text not null,
  service_type text not null default 'Hosting',
  renewal_cycle text not null default 'Anual',
  expiration_date date not null,
  auto_renew boolean not null default false,
  payment_method text null default 'Manual / No configurado',
  provider text not null default 'Cdmon',
  parent_id text null,
  client_name text null,
  company_id uuid null references public.companies(id) on delete set null,
  price_cost numeric(10, 2) null default 0,
  price_client numeric(10, 2) null default 0,
  status text not null default 'active' check (status in ('active', 'expired', 'renewed', 'cancelled')),
  notes text null,
  last_notified_at timestamptz null,
  notification_stages jsonb null default '{"7": false, "15": false, "30": false, "60": false, "90": false}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hosting_expiration_date on public.hosting_services(expiration_date);
create index if not exists idx_hosting_name on public.hosting_services(name);
create index if not exists idx_hosting_parent_id on public.hosting_services(parent_id);

alter table public.hosting_services enable row level security;

drop policy if exists "hosting_select_policy" on public.hosting_services;
create policy "hosting_select_policy" on public.hosting_services
  for select using (true);

drop policy if exists "hosting_all_policy" on public.hosting_services;
create policy "hosting_all_policy" on public.hosting_services
  for all using (true) with check (true);

-- 5. TABLA: taskflow_items (Tareas, Reuniones y Entregables del Calendario)
create table if not exists public.taskflow_items (
  id text primary key,
  type text not null default 'task' check (type in ('task', 'meeting')),
  title text not null,
  description text null,
  company_id uuid null references public.companies(id) on delete set null,
  company_name text not null,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'review', 'done')),
  priority text null default 'media',
  color_strip text null default 'purple',
  custom_color text null,
  list_id text null,
  reschedule_mode text null default 'manual',
  auto_reschedule boolean not null default false,
  reschedule_days integer not null default 1,
  date date not null,
  start_time text null,
  end_time text null,
  location text null,
  meeting_url text null,
  estimated_hours numeric(5, 2) null default 0,
  created_by text null default 'Equipo Brain Up',
  created_by_name text null,
  is_shared boolean not null default true,
  assignees jsonb not null default '["Todos"]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_taskflow_items_date on public.taskflow_items(date);
create index if not exists idx_taskflow_items_status on public.taskflow_items(status);
create index if not exists idx_taskflow_items_company on public.taskflow_items(company_id);

alter table public.taskflow_items enable row level security;

drop policy if exists "taskflow_items_select_policy" on public.taskflow_items;
create policy "taskflow_items_select_policy" on public.taskflow_items
  for select using (true);

drop policy if exists "taskflow_items_all_policy" on public.taskflow_items;
create policy "taskflow_items_all_policy" on public.taskflow_items
  for all using (true) with check (true);

-- 6. TABLA: taskflow_lists (Listas personalizadas de TaskFlow)
create table if not exists public.taskflow_lists (
  id text primary key,
  name text not null,
  color text not null default '#8E0E75',
  created_at timestamptz not null default now()
);

alter table public.taskflow_lists enable row level security;

drop policy if exists "taskflow_lists_select_policy" on public.taskflow_lists;
create policy "taskflow_lists_select_policy" on public.taskflow_lists
  for select using (true);

drop policy if exists "taskflow_lists_all_policy" on public.taskflow_lists;
create policy "taskflow_lists_all_policy" on public.taskflow_lists
  for all using (true) with check (true);

-- 7. TABLA: taskflow_postits (Mural y Pizarra Modular Interactiva de Post-its)
create table if not exists public.taskflow_postits (
  id text primary key,
  title text not null,
  content text not null default '',
  color text not null default 'yellow',
  target_date date not null,
  target_time text null default '09:00',
  reminders jsonb not null default '[]',
  is_pinned boolean not null default false,
  is_completed boolean not null default false,
  pos_x numeric null default 0,
  pos_y numeric null default 0,
  width numeric null default 260,
  height numeric null default 220,
  z_index integer null default 1,
  size_preset text null default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_taskflow_postits_target_date on public.taskflow_postits(target_date);
create index if not exists idx_taskflow_postits_completed on public.taskflow_postits(is_completed);

alter table public.taskflow_postits enable row level security;

drop policy if exists "taskflow_postits_select_policy" on public.taskflow_postits;
create policy "taskflow_postits_select_policy" on public.taskflow_postits
  for select using (true);

drop policy if exists "taskflow_postits_all_policy" on public.taskflow_postits;
create policy "taskflow_postits_all_policy" on public.taskflow_postits
  for all using (true) with check (true);



