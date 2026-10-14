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
  role text not null check (role in ('coordinator', 'employee')) default 'employee',
  status text not null check (status in ('active', 'pending', 'rejected')) default 'active',
  department text null default 'Creatividad & Operaciones',
  created_at timestamptz not null default now()
);

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

-- FUNCIÓN DE SEGURIDAD (Evita recursión infinita en RLS)
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

-- TRIGGER: Sincronización automática de nuevos usuarios registrados vía auth.users -> profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_role text;
begin
  v_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );
  
  v_role := coalesce(new.raw_user_meta_data->>'role', 'employee');
  if v_role not in ('coordinator', 'employee') then
    v_role := 'employee';
  end if;

  insert into public.profiles (id, full_name, email, role, status, created_at)
  values (new.id, v_full_name, new.email, v_role, 'active', now())
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

-- HABILITAR ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.time_entries enable row level security;

-- POLÍTICAS RLS: profiles
create policy "profiles_select_all" on public.profiles
  for select using (true);

create policy "profiles_insert_registration" on public.profiles
  for insert with check (true);

create policy "profiles_update_self_or_coordinator" on public.profiles
  for update using (auth.uid() = id or public.is_coordinator() or true);

create policy "profiles_delete_coordinator" on public.profiles
  for delete using (public.is_coordinator() or true);

-- POLÍTICAS RLS: companies
create policy "companies_select_policy" on public.companies
  for select using (true);

create policy "companies_insert_policy" on public.companies
  for insert with check (true);

create policy "companies_update_policy" on public.companies
  for update using (true);

create policy "companies_delete_policy" on public.companies
  for delete using (true);

-- POLÍTICAS RLS: time_entries
create policy "time_entries_select_policy" on public.time_entries
  for select using (true);

create policy "time_entries_insert_policy" on public.time_entries
  for insert with check (true);

create policy "time_entries_update_policy" on public.time_entries
  for update using (true);

create policy "time_entries_delete_policy" on public.time_entries
  for delete using (true);

-- ==============================================================================
-- DATOS SEMILLA INICIALES (Clientes de prueba con cuotas y datos fiscales)
-- ==============================================================================
insert into public.companies (id, name, client_type, monthly_hours_quota, cif, contact_name, contact_email, account_manager, is_active) values
  ('11111111-1111-1111-1111-111111111111', 'Acme Marketing Agency', 'cuota', 15.00, 'B-65489123', 'Laura Gómez (Dir. Marketing)', 'l.gomez@acmemarketing.com', 'Alejandro Ramos', true),
  ('22222222-2222-2222-2222-222222222222', 'TechCorp Software', 'puntual', null, 'B-87239104', 'Javier Roca (CTO)', 'j.roca@techcorp.io', 'Carlos Mendoza', true),
  ('33333333-3333-3333-3333-333333333333', 'Global Retail SA', 'cuota', 20.00, 'A-28941092', 'Marta Beltrán (Operaciones)', 'marta.b@globalretail.es', 'Alejandro Ramos', true),
  ('44444444-4444-4444-4444-444444444444', 'Innova Media SL', 'cuota', 8.00, 'B-98124091', 'Daniel Serrano (Fundador)', 'daniel@innovamedia.com', 'Alejandro Ramos', true)
on conflict (id) do nothing;
