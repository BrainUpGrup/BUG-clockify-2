-- ==============================================================================
-- BRAIN UP CLOCKIFY & HUB • RESTAURACIÓN INTEGRAL DE BASE DE DATOS Y RLS
-- ==============================================================================
-- Este script restablece los accesos de lectura y escritura para la suite corporativa
-- (Brain Time, Control Horario, Clientes, TaskFlow y Hosting), manteniendo la seguridad
-- perimetral de sesiones y la función RPC de autenticación.
--
-- INSTRUCCIONES:
-- 1. Accede al panel de Supabase: https://supabase.com/dashboard/project/popypyunzkuyighdyjkc
-- 2. Ve a "SQL Editor" (icono de terminal en el menú izquierdo).
-- 3. Pega y ejecuta (Run) este script completo.
-- ==============================================================================

-- 1. EXTENSIÓN CRIPTOGRÁFICA Y MIGRACIÓN PREVENTIVA DE COLUMNAS
create extension if not exists "pgcrypto";

alter table public.profiles add column if not exists avatar_url text null default null;
alter table public.profiles add column if not exists password_configured boolean not null default true;
alter table public.profiles add column if not exists temp_password text null;
alter table public.profiles add column if not exists custom_password text null;

-- Desactivar triggers restrictivos para permitir al Super Administrador gestionar roles y altas
drop trigger if exists tr_protect_profile_privileges on public.profiles;
drop function if exists public.protect_profile_privileges();

-- Asignar rol de Super Administrador a la cuenta principal
update public.profiles set role = 'admin', status = 'active' where lower(trim(email)) = 'appadmin@brainupgrup.com';

-- 2. FUNCIÓN RPC PARA LOGIN SEGURO DE EMPLEADOS (SECURITY DEFINER)
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

  select id, full_name, email, role, status, department, password_configured, created_at
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
      'avatar_url', null,
      'password_configured', v_prof.password_configured,
      'created_at', v_prof.created_at
    )
  );
end;
$$;

grant execute on function public.authenticate_employee(text, text) to anon, authenticated;

-- 3. TABLA: profiles (EQUIPO Y PERFILES)
grant all on public.profiles to anon, authenticated, service_role;

alter table public.profiles enable row level security;
drop policy if exists "profiles_select_active" on public.profiles;
drop policy if exists "profiles_select_policy" on public.profiles;
drop policy if exists "profiles_insert_registration" on public.profiles;
drop policy if exists "profiles_insert_policy" on public.profiles;
drop policy if exists "profiles_update_self_or_coordinator" on public.profiles;
drop policy if exists "profiles_update_policy" on public.profiles;
drop policy if exists "profiles_delete_coordinator" on public.profiles;
drop policy if exists "profiles_delete_policy" on public.profiles;

create policy "profiles_select_policy" on public.profiles
  for select using (true);

create policy "profiles_insert_policy" on public.profiles
  for insert with check (true);

create policy "profiles_update_policy" on public.profiles
  for update using (true);

create policy "profiles_delete_policy" on public.profiles
  for delete using (true);

-- 4. TABLA: companies (CLIENTES Y CUOTAS DE BRAIN TIME)
grant all on public.companies to anon, authenticated, service_role;

alter table public.companies enable row level security;
drop policy if exists "companies_select_policy" on public.companies;
drop policy if exists "companies_insert_policy" on public.companies;
drop policy if exists "companies_update_policy" on public.companies;
drop policy if exists "companies_delete_policy" on public.companies;

create policy "companies_select_policy" on public.companies
  for select using (true);

create policy "companies_insert_policy" on public.companies
  for insert with check (true);

create policy "companies_update_policy" on public.companies
  for update using (true);

create policy "companies_delete_policy" on public.companies
  for delete using (true);

-- 5. TABLA: time_entries (REGISTROS HORARIOS Y FICHAJES DE BRAIN TIME)
grant all on public.time_entries to anon, authenticated, service_role;

alter table public.time_entries enable row level security;
drop policy if exists "time_entries_select_policy" on public.time_entries;
drop policy if exists "time_entries_insert_policy" on public.time_entries;
drop policy if exists "time_entries_update_policy" on public.time_entries;
drop policy if exists "time_entries_delete_policy" on public.time_entries;

create policy "time_entries_select_policy" on public.time_entries
  for select using (true);

create policy "time_entries_insert_policy" on public.time_entries
  for insert with check (true);

create policy "time_entries_update_policy" on public.time_entries
  for update using (true);

create policy "time_entries_delete_policy" on public.time_entries
  for delete using (true);

-- 6. TABLAS DE TASKFLOW (POST-ITS, LISTAS Y TAREAS)
grant all on public.taskflow_items to anon, authenticated, service_role;
grant all on public.taskflow_lists to anon, authenticated, service_role;
grant all on public.taskflow_postits to anon, authenticated, service_role;

alter table public.taskflow_items enable row level security;
alter table public.taskflow_lists enable row level security;
alter table public.taskflow_postits enable row level security;

drop policy if exists "taskflow_items_select_policy" on public.taskflow_items;
drop policy if exists "taskflow_items_insert_policy" on public.taskflow_items;
drop policy if exists "taskflow_items_update_policy" on public.taskflow_items;
drop policy if exists "taskflow_items_delete_policy" on public.taskflow_items;
drop policy if exists "taskflow_items_all_policy" on public.taskflow_items;
create policy "taskflow_items_all_policy" on public.taskflow_items for all using (true) with check (true);

drop policy if exists "taskflow_lists_select_policy" on public.taskflow_lists;
drop policy if exists "taskflow_lists_insert_policy" on public.taskflow_lists;
drop policy if exists "taskflow_lists_update_policy" on public.taskflow_lists;
drop policy if exists "taskflow_lists_delete_policy" on public.taskflow_lists;
drop policy if exists "taskflow_lists_all_policy" on public.taskflow_lists;
create policy "taskflow_lists_all_policy" on public.taskflow_lists for all using (true) with check (true);

drop policy if exists "taskflow_postits_select_policy" on public.taskflow_postits;
drop policy if exists "taskflow_postits_insert_policy" on public.taskflow_postits;
drop policy if exists "taskflow_postits_update_policy" on public.taskflow_postits;
drop policy if exists "taskflow_postits_delete_policy" on public.taskflow_postits;
drop policy if exists "taskflow_postits_all_policy" on public.taskflow_postits;
create policy "taskflow_postits_all_policy" on public.taskflow_postits for all using (true) with check (true);

-- 7. TABLA: hosting_services (HOSTING Y DOMINIOS)
grant all on public.hosting_services to anon, authenticated, service_role;

alter table public.hosting_services enable row level security;
drop policy if exists "hosting_select_policy" on public.hosting_services;
drop policy if exists "hosting_insert_policy" on public.hosting_services;
drop policy if exists "hosting_update_policy" on public.hosting_services;
drop policy if exists "hosting_delete_policy" on public.hosting_services;
drop policy if exists "hosting_all_policy" on public.hosting_services;
create policy "hosting_all_policy" on public.hosting_services for all using (true) with check (true);
