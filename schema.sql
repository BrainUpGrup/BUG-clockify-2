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


