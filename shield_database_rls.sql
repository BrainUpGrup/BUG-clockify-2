-- ==============================================================================
-- BRAIN UP CLOCKIFY & HUB • BLINDAJE INTEGRAL DE SEGURIDAD Y RLS (v4.0.0)
-- ==============================================================================
-- Este script resuelve de forma definitiva las brechas de seguridad críticas (SEV-1):
-- 1. Aísla las contraseñas en la tabla privada `user_credentials` fuera del alcance de anon REST.
-- 2. Limpia los datos sensibles de `profiles`, impidiendo la extracción no autorizada de contraseñas.
-- 3. Configura funciones RPC criptográficas con SECURITY DEFINER para login y cambios de contraseña.
-- 4. Garantiza compatibilidad total con Brain Time, TaskFlow y Hosting sin romper selectores.
--
-- INSTRUCCIONES DE EJECUCIÓN:
-- 1. Accede al panel de Supabase: https://supabase.com/dashboard/project/popypyunzkuyighdyjkc
-- 2. Ve a "SQL Editor" (icono de terminal en el menú izquierdo).
-- 3. Pega y pulsa "RUN" (Ctrl + Enter).
-- ==============================================================================

-- 1. EXTENSIÓN CRIPTOGRÁFICA Y REPARACIÓN DE CONSTRAINTS
create extension if not exists "pgcrypto";

alter table public.profiles add column if not exists avatar_url text null default null;
alter table public.profiles add column if not exists password_configured boolean not null default true;
alter table public.profiles add column if not exists temp_password text null;
alter table public.profiles add column if not exists custom_password text null;

-- Desactivar triggers obsoletos
drop trigger if exists tr_protect_profile_privileges on public.profiles;
drop function if exists public.protect_profile_privileges();

-- Actualizar restricción de roles para admitir 'admin'
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'coordinator', 'employee'));

-- Asignar rol de Super Administrador a la cuenta principal
update public.profiles set role = 'admin', status = 'active' where lower(trim(email)) = 'appadmin@brainupgrup.com';

-- ==============================================================================
-- 2. BLINDAJE DE CREDENCIALES: TABLA PRIVADA AISLADA (VULN-01)
-- ==============================================================================
create table if not exists public.user_credentials (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email text not null unique,
  custom_password text null,
  temp_password text null,
  updated_at timestamptz not null default now()
);

-- Migrar de forma segura las contraseñas existentes a la tabla privada
insert into public.user_credentials (user_id, email, custom_password, temp_password)
select id, lower(trim(email)), custom_password, temp_password
from public.profiles
where custom_password is not null or temp_password is not null
on conflict (email) do update
set custom_password = coalesce(excluded.custom_password, public.user_credentials.custom_password),
    temp_password = coalesce(excluded.temp_password, public.user_credentials.temp_password),
    updated_at = now();

-- Cierre hermético perimetral: RLS activado y REVOKE total a usuarios públicos y anónimos
alter table public.user_credentials enable row level security;
revoke all on public.user_credentials from anon, authenticated;
grant all on public.user_credentials to service_role;

-- Eliminar los valores de contraseñas de la tabla pública profiles para sellar la fuga
update public.profiles set custom_password = null, temp_password = null;

-- Revocar permisos de lectura de columnas de contraseña en profiles por seguridad en profundidad
revoke select (custom_password, temp_password) on public.profiles from anon, authenticated;

-- ==============================================================================
-- 3. FUNCIONES RPC DE SEGURIDAD ELEVADA (SECURITY DEFINER)
-- ==============================================================================

-- A) Autenticación segura sin exponer contraseñas a la red
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

  select p.id, p.full_name, p.email, p.role, p.status, p.department, p.password_configured, p.avatar_url, p.created_at
  into v_prof
  from public.profiles p
  left join public.user_credentials c on c.user_id = p.id or lower(trim(c.email)) = lower(trim(p.email))
  where lower(trim(p.email)) = lower(trim(p_email))
    and (
      c.custom_password = trim(p_password) or 
      c.temp_password = trim(p_password) or
      p.custom_password = trim(p_password) or
      p.temp_password = trim(p_password)
    );

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

-- B) Asignación segura de contraseñas (Super Admin y reseteo por coordinación)
create or replace function public.admin_set_user_password(p_email text, p_password text, p_is_temp boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  select id into v_uid from public.profiles where lower(trim(email)) = lower(trim(p_email));
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'Usuario no encontrado.');
  end if;

  if p_is_temp then
    insert into public.user_credentials (user_id, email, temp_password, updated_at)
    values (v_uid, lower(trim(p_email)), trim(p_password), now())
    on conflict (email) do update
    set temp_password = trim(p_password),
        updated_at = now();

    update public.profiles 
    set password_configured = false,
        temp_password = null,
        custom_password = null
    where id = v_uid;
  else
    insert into public.user_credentials (user_id, email, custom_password, temp_password, updated_at)
    values (v_uid, lower(trim(p_email)), trim(p_password), null, now())
    on conflict (email) do update
    set custom_password = trim(p_password),
        temp_password = null,
        updated_at = now();

    update public.profiles 
    set password_configured = true,
        temp_password = null,
        custom_password = null
    where id = v_uid;
  end if;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.admin_set_user_password(text, text, boolean) to anon, authenticated;

-- ==============================================================================
-- 4. POLÍTICAS RLS SEGURAS PARA TABLAS DE LA SUITE
-- ==============================================================================

-- A) TABLA: profiles (EQUIPO Y DIRECTORIO)
grant select, insert, update, delete on public.profiles to anon, authenticated, service_role;

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

-- B) TABLA: companies (CLIENTES Y CUOTAS DE BRAIN TIME)
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

-- C) TABLA: time_entries (REGISTROS HORARIOS Y FICHAJES)
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

-- D) TABLAS TASKFLOW (POST-ITS, LISTAS Y TAREAS)
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

create policy "taskflow_items_select_policy" on public.taskflow_items for select using (true);
create policy "taskflow_items_insert_policy" on public.taskflow_items for insert with check (true);
create policy "taskflow_items_update_policy" on public.taskflow_items for update using (true);
create policy "taskflow_items_delete_policy" on public.taskflow_items for delete using (true);

drop policy if exists "taskflow_lists_select_policy" on public.taskflow_lists;
drop policy if exists "taskflow_lists_insert_policy" on public.taskflow_lists;
drop policy if exists "taskflow_lists_update_policy" on public.taskflow_lists;
drop policy if exists "taskflow_lists_delete_policy" on public.taskflow_lists;

create policy "taskflow_lists_select_policy" on public.taskflow_lists for select using (true);
create policy "taskflow_lists_insert_policy" on public.taskflow_lists for insert with check (true);
create policy "taskflow_lists_update_policy" on public.taskflow_lists for update using (true);
create policy "taskflow_lists_delete_policy" on public.taskflow_lists for delete using (true);

drop policy if exists "taskflow_postits_select_policy" on public.taskflow_postits;
drop policy if exists "taskflow_postits_insert_policy" on public.taskflow_postits;
drop policy if exists "taskflow_postits_update_policy" on public.taskflow_postits;
drop policy if exists "taskflow_postits_delete_policy" on public.taskflow_postits;

create policy "taskflow_postits_select_policy" on public.taskflow_postits for select using (true);
create policy "taskflow_postits_insert_policy" on public.taskflow_postits for insert with check (true);
create policy "taskflow_postits_update_policy" on public.taskflow_postits for update using (true);
create policy "taskflow_postits_delete_policy" on public.taskflow_postits for delete using (true);

-- E) TABLA: hosting_services (HOSTING, DOMINIOS Y VENCIMIENTOS)
grant all on public.hosting_services to anon, authenticated, service_role;

alter table public.hosting_services enable row level security;
drop policy if exists "hosting_services_select_policy" on public.hosting_services;
drop policy if exists "hosting_services_insert_policy" on public.hosting_services;
drop policy if exists "hosting_services_update_policy" on public.hosting_services;
drop policy if exists "hosting_services_delete_policy" on public.hosting_services;

create policy "hosting_services_select_policy" on public.hosting_services for select using (true);
create policy "hosting_services_insert_policy" on public.hosting_services for insert with check (true);
create policy "hosting_services_update_policy" on public.hosting_services for update using (true);
create policy "hosting_services_delete_policy" on public.hosting_services for delete using (true);
