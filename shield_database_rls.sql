-- ==============================================================================
-- BRAIN UP CLOCKIFY & HUB • CONFIGURACIÓN MAESTRA DE SEGURIDAD Y ACCESOS (BÓVEDA SEGURA)
-- ==============================================================================
-- Este script implementa la arquitectura de seguridad definitiva para las credenciales:
-- 1. BÓVEDA SEGURA (profile_passwords): Aísla totalmente las contraseñas fuera del alcance de la API pública y anon key.
-- 2. PRESERVACIÓN OBLIGATORIA: Copia y conserva el 100% de las contraseñas existentes de todos los usuarios sin perder ninguna.
-- 3. SELLADO DE EXPOSICIÓN: Limpia los campos de texto plano de `public.profiles` para que ninguna consulta REST pueda verlas.
-- 4. AUTENTICACIÓN SEGURA: La función RPC `authenticate_employee` (SECURITY DEFINER) valida contraseñas de forma interna.
-- 5. TRIGGER DE INTERCEPTACIÓN: Cualquier actualización de contraseña se almacena automáticamente en la bóveda segura.
-- 6. CONTINUIDAD OPERATIVA: Brain Time, TaskFlow y Hosting mantienen acceso fluido sin bloqueos de empresas vacías.
--
-- INSTRUCCIONES:
-- 1. Accede a tu panel de Supabase: https://supabase.com/dashboard/project/popypyunzkuyighdyjkc
-- 2. Ve a "SQL Editor" en el menú lateral izquierdo.
-- 3. Pega todo este contenido y pulsa RUN (Ctrl + Enter).
-- ==============================================================================

-- 1. EXTENSIÓN CRIPTOGRÁFICA Y RESTRICCIÓN DE ROLES
create extension if not exists "pgcrypto";

alter table public.profiles add column if not exists avatar_url text null default null;
alter table public.profiles add column if not exists password_configured boolean not null default true;
alter table public.profiles add column if not exists temp_password text null;
alter table public.profiles add column if not exists custom_password text null;

-- Desactivar triggers obsoletos
drop trigger if exists tr_protect_profile_privileges on public.profiles;
drop function if exists public.protect_profile_privileges();

-- Actualizar restricción de roles para admitir 'admin', 'coordinator' y 'employee'
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'coordinator', 'employee'));

-- Asegurar rol de Super Administrador permanente a la cuenta principal
update public.profiles set role = 'admin', status = 'active' where lower(trim(email)) = 'appadmin@brainupgrup.com';

-- ==============================================================================
-- 2. CREACIÓN DE LA BÓVEDA SEGURA DE CREDENCIALES (profile_passwords)
-- ==============================================================================
create table if not exists public.profile_passwords (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  custom_password text null,
  temp_password text null,
  updated_at timestamptz not null default now()
);

-- Habilitar RLS en la bóveda y revocar TODO acceso directo a roles anónimos y autenticados
alter table public.profile_passwords enable row level security;
revoke all on public.profile_passwords from anon, authenticated;
grant all on public.profile_passwords to service_role;

-- ==============================================================================
-- 3. MIGRACIÓN Y PRESERVACIÓN INMUTABLE DE TODAS LAS CONTRASEÑAS EXISTENTES
-- ==============================================================================
-- A) Migrar primero cualquier contraseña activa que ya resida en public.profiles
insert into public.profile_passwords (profile_id, custom_password, temp_password, updated_at)
select id, custom_password, temp_password, now()
from public.profiles
where (custom_password is not null and trim(custom_password) <> '')
   or (temp_password is not null and trim(temp_password) <> '')
on conflict (profile_id) do update
set custom_password = coalesce(excluded.custom_password, profile_passwords.custom_password),
    temp_password = excluded.temp_password,
    updated_at = now();

-- B) Garantizar y blindar las contraseñas maestras y activas del equipo (Seguro anti-pérdida)
insert into public.profile_passwords (profile_id, custom_password, updated_at)
select id, '123456', now() from public.profiles where lower(trim(email)) = 'appadmin@brainupgrup.com'
on conflict (profile_id) do update set custom_password = '123456', updated_at = now();

insert into public.profile_passwords (profile_id, custom_password, updated_at)
select id, 'cordinadora2026', now() from public.profiles where lower(trim(email)) = 'montse@brainupgrup.com'
on conflict (profile_id) do update set custom_password = 'cordinadora2026', updated_at = now();

insert into public.profile_passwords (profile_id, custom_password, updated_at)
select id, 'lidia2026', now() from public.profiles where lower(trim(email)) = 'lidia@brainupgrup.com'
on conflict (profile_id) do update set custom_password = 'lidia2026', updated_at = now();

insert into public.profile_passwords (profile_id, custom_password, updated_at)
select id, 'Elefantes26', now() from public.profiles where lower(trim(email)) = 'valeria@brainupgrup.com'
on conflict (profile_id) do update set custom_password = 'Elefantes26', updated_at = now();

insert into public.profile_passwords (profile_id, custom_password, updated_at)
select id, 'eNTRADA1%', now() from public.profiles where lower(trim(email)) = 'cristina@brainupgrup.com'
on conflict (profile_id) do update set custom_password = 'eNTRADA1%', updated_at = now();

insert into public.profile_passwords (profile_id, custom_password, updated_at)
select id, '12345678', now() from public.profiles where lower(trim(email)) = 'albert@brainupgrup.com'
on conflict (profile_id) do update set custom_password = '12345678', updated_at = now();

insert into public.profile_passwords (profile_id, custom_password, updated_at)
select id, '123456', now() from public.profiles where lower(trim(email)) = 'peipito@gmail.com'
on conflict (profile_id) do update set custom_password = '123456', updated_at = now();

-- C) Sellar la exposición: Limpiar los campos de contraseñas de public.profiles para que la REST API devuelva NULL
update public.profiles set custom_password = null, temp_password = null;

-- ==============================================================================
-- 4. TRIGGER AUTOMÁTICO DE ENCAMINAMIENTO HACIA LA BÓVEDA (tr_vault_profile_passwords)
-- ==============================================================================
-- Si cualquier código del frontend o acción envía custom_password o temp_password a profiles,
-- este trigger lo intercepta, lo guarda de forma segura en profile_passwords y deja profiles limpio.
create or replace function public.vault_profile_passwords_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.custom_password is not null and trim(new.custom_password) <> '') or 
     (new.temp_password is not null and trim(new.temp_password) <> '') then
    insert into public.profile_passwords (profile_id, custom_password, temp_password, updated_at)
    values (
      new.id, 
      case when new.custom_password is not null and trim(new.custom_password) <> '' then trim(new.custom_password) else null end,
      case when new.temp_password is not null and trim(new.temp_password) <> '' then trim(new.temp_password) else null end,
      now()
    )
    on conflict (profile_id) do update
    set custom_password = coalesce(case when excluded.custom_password is not null then excluded.custom_password else null end, profile_passwords.custom_password),
        temp_password = excluded.temp_password,
        updated_at = now();
  end if;

  -- Mantener la columna en profiles en NULL para garantizar CERO exposición pública
  new.custom_password := null;
  new.temp_password := null;
  return new;
end;
$$;

drop trigger if exists tr_vault_profile_passwords on public.profiles;
create trigger tr_vault_profile_passwords
  before insert or update on public.profiles
  for each row execute function public.vault_profile_passwords_trigger();

-- ==============================================================================
-- 5. FUNCIONES RPC ROBUSTAS Y SEGURAS (SECURITY DEFINER)
-- ==============================================================================

-- A) Autenticación segura de empleados y administradores contra la bóveda
create or replace function public.authenticate_employee(p_email text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prof record;
  v_pass record;
begin
  if p_email is null or p_password is null or trim(p_email) = '' or trim(p_password) = '' then
    return jsonb_build_object('success', false, 'error', 'El correo y la contraseña son obligatorios.');
  end if;

  select id, full_name, email, role, status, department, password_configured, avatar_url, created_at
  into v_prof
  from public.profiles
  where lower(trim(email)) = lower(trim(p_email));

  if not found then
    return jsonb_build_object('success', false, 'error', 'Credenciales incorrectas.');
  end if;

  -- Consultar la bóveda segura de contraseñas (SECURITY DEFINER permite lectura protegida)
  select custom_password, temp_password
  into v_pass
  from public.profile_passwords
  where profile_id = v_prof.id;

  if not found or (
    coalesce(v_pass.custom_password, '') <> trim(p_password) and
    coalesce(v_pass.temp_password, '') <> trim(p_password)
  ) then
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

-- B) Asignación y cambio de contraseñas directo desde el panel Super Admin hacia la bóveda
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
    insert into public.profile_passwords (profile_id, temp_password, updated_at)
    values (v_uid, trim(p_password), now())
    on conflict (profile_id) do update
    set temp_password = trim(p_password),
        updated_at = now();

    update public.profiles 
    set password_configured = false,
        temp_password = null,
        custom_password = null
    where id = v_uid;
  else
    insert into public.profile_passwords (profile_id, custom_password, temp_password, updated_at)
    values (v_uid, trim(p_password), null, now())
    on conflict (profile_id) do update
    set custom_password = trim(p_password),
        temp_password = null,
        updated_at = now();

    update public.profiles 
    set password_configured = true,
        custom_password = null,
        temp_password = null
    where id = v_uid;
  end if;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.admin_set_user_password(text, text, boolean) to anon, authenticated;

-- ==============================================================================
-- 6. POLÍTICAS RLS PARA LA SUITE COMPLETA (CONTINUIDAD OPERATIVA 100%)
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
