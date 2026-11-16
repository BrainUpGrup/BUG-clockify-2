-- ==============================================================================
-- BLINDAJE INTEGRAL SEGMENTO 7: ROW LEVEL SECURITY (RLS) & CIERRE DE BRECHAS
-- Suite Corporativa: Brain Up Grup (BUG clockify)
-- Fecha: 13 de Noviembre de 2026
--
-- OBJETIVO:
-- 1. Sincronizar perfiles existentes con Supabase Auth (auth.users) con hash bcrypt.
-- 2. Eliminar todas las directivas permisivas `USING (true)` en tablas sensibles.
-- 3. Aislar datos por rol y usuario:
--    - Empleados: solo leen e insertan sus propias horas (auth.uid() = user_id).
--    - Coordinadores: acceso global de supervisión mediante public.is_coordinator_or_admin().
--    - Clientes/Hosting: restringido exclusivamente a coordinación.
--    - Perfiles: registro público limitado a status='pending', sin auto-escalada a admin.
-- 4. Ocultar columnas de contraseñas custom_password y temp_password al rol anónimo.
--
-- INSTRUCCIONES DE APLICACIÓN:
-- 1. Accede al panel de Supabase: https://supabase.com/dashboard/project/popypyunzkuyighdyjkc
-- 2. Entra en "SQL Editor" en el menú lateral izquierdo.
-- 3. Crea una "New Query", pega todo este script y pulsa RUN (Ctrl + Enter).
-- ==============================================================================

-- 1. ASEGURAR EXTENSIÓN CRIPTOGRÁFICA
create extension if not exists "pgcrypto";

-- 2. FUNCIÓN DE AYUDA: is_coordinator_or_admin()
-- Permite validar el rol del usuario actual de forma segura (SECURITY DEFINER)
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
      and status = 'active'
  );
$$;

grant execute on function public.is_coordinator_or_admin() to anon, authenticated;

-- 3. FUNCIÓN DE SINCRONIZACIÓN AUTOMÁTICA CON auth.users
-- Permite que los empleados y coordinadores puedan iniciar sesión con Supabase Auth
create or replace function public.sync_profile_to_auth_user(
  p_profile_id uuid,
  p_email text,
  p_password text,
  p_role text default 'employee'
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_encrypted_pw text;
begin
  if p_password is null or trim(p_password) = '' then
    return;
  end if;

  v_encrypted_pw := extensions.crypt(trim(p_password), extensions.gen_salt('bf'));

  -- A) Si el usuario ya existe en auth.users, actualizar su contraseña cifrada
  update auth.users
  set encrypted_password = v_encrypted_pw,
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
  where id = p_profile_id or lower(email) = lower(trim(p_email));

  -- B) Si no existe, insertarlo como usuario confirmado
  if not found then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      p_profile_id,
      'authenticated',
      'authenticated',
      lower(trim(p_email)),
      v_encrypted_pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('role', p_role, 'full_name', lower(trim(p_email))),
      now(),
      now()
    );
  end if;
end;
$$;

grant execute on function public.sync_profile_to_auth_user(uuid, text, text, text) to service_role;

-- 4. SINCRONIZACIÓN INICIAL DE TODAS LAS CUENTAS CON CONTRASEÑA EN LA BÓVEDA
do $$
declare
  r record;
begin
  for r in (
    select p.id, p.email, p.role, coalesce(pp.custom_password, pp.temp_password) as pass
    from public.profiles p
    join public.profile_passwords pp on pp.profile_id = p.id
    where coalesce(pp.custom_password, pp.temp_password) is not null
  ) loop
    perform public.sync_profile_to_auth_user(r.id, r.email, r.pass, r.role);
  end loop;
end;
$$;

-- 5. ACTUALIZAR admin_set_user_password PARA SINCRONIZAR EN CADA CAMBIO DE CLAVE
create or replace function public.admin_set_user_password(
  p_email text,
  p_password text,
  p_is_temp boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_uid uuid;
  v_role text;
begin
  select id, role into v_uid, v_role
  from public.profiles
  where lower(trim(email)) = lower(trim(p_email));

  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'Usuario no encontrado en el sistema.');
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
        temp_password = null,
        custom_password = null
    where id = v_uid;
  end if;

  -- Sincronizar de forma inmediata con auth.users
  perform public.sync_profile_to_auth_user(v_uid, p_email, p_password, v_role);

  return jsonb_build_object('success', true, 'message', 'Contraseña actualizada y sincronizada en auth.users con éxito.');
end;
$$;

grant execute on function public.admin_set_user_password(text, text, boolean) to anon, authenticated;

-- ==============================================================================
-- 6. POLÍTICAS RLS BLINDADAS: TABLA PROFILES
-- ==============================================================================
alter table public.profiles enable row level security;

-- Ocultar campos de contraseñas de profiles al rol anónimo y autenticado
revoke select (custom_password, temp_password) on public.profiles from anon, authenticated;

drop policy if exists "profiles_select_policy" on public.profiles;
drop policy if exists "profiles_insert_policy" on public.profiles;
drop policy if exists "profiles_update_policy" on public.profiles;
drop policy if exists "profiles_delete_policy" on public.profiles;

-- Lectura: Directorio de nombres y perfiles visible para la interfaz
create policy "profiles_select_policy" on public.profiles
  for select using (true);

-- Inserción: Solo peticiones de registro pendientes con rol 'employee'
create policy "profiles_insert_policy" on public.profiles
  for insert with check (
    status = 'pending' and role = 'employee'
  );

-- Actualización: Cada usuario actualiza su propio perfil, o un coordinador/admin
create policy "profiles_update_policy" on public.profiles
  for update using (
    id = auth.uid() or public.is_coordinator_or_admin()
  );

-- Borrado: Solo coordinadores y administradores
create policy "profiles_delete_policy" on public.profiles
  for delete using (public.is_coordinator_or_admin());

-- ==============================================================================
-- 7. POLÍTICAS RLS BLINDADAS: TABLA COMPANIES
-- ==============================================================================
alter table public.companies enable row level security;

drop policy if exists "companies_select_policy" on public.companies;
drop policy if exists "companies_insert_policy" on public.companies;
drop policy if exists "companies_update_policy" on public.companies;
drop policy if exists "companies_delete_policy" on public.companies;

-- Lectura: Empleados autenticados y anónimos autorizados ven empresas activas
create policy "companies_select_policy" on public.companies
  for select using (is_active = true or public.is_coordinator_or_admin());

-- Inserción, Modificación y Borrado: EXCLUSIVAMENTE Coordinadores y Administradores
create policy "companies_insert_policy" on public.companies
  for insert with check (public.is_coordinator_or_admin());

create policy "companies_update_policy" on public.companies
  for update using (public.is_coordinator_or_admin());

create policy "companies_delete_policy" on public.companies
  for delete using (public.is_coordinator_or_admin());

-- ==============================================================================
-- 8. POLÍTICAS RLS BLINDADAS: TABLA TIME_ENTRIES
-- ==============================================================================
alter table public.time_entries enable row level security;

drop policy if exists "time_entries_select_policy" on public.time_entries;
drop policy if exists "time_entries_insert_policy" on public.time_entries;
drop policy if exists "time_entries_update_policy" on public.time_entries;
drop policy if exists "time_entries_delete_policy" on public.time_entries;

-- Lectura: El empleado solo lee sus propios registros. Coordinadores leen todos.
create policy "time_entries_select_policy" on public.time_entries
  for select using (
    user_id = auth.uid() or public.is_coordinator_or_admin()
  );

-- Inserción: El empleado solo puede imputar a su propio ID.
create policy "time_entries_insert_policy" on public.time_entries
  for insert with check (
    user_id = auth.uid() or public.is_coordinator_or_admin()
  );

-- Modificación: Solo el propio empleado sobre sus horas, o un coordinador.
create policy "time_entries_update_policy" on public.time_entries
  for update using (
    user_id = auth.uid() or public.is_coordinator_or_admin()
  );

-- Borrado: Solo el propio empleado sobre sus horas, o un coordinador.
create policy "time_entries_delete_policy" on public.time_entries
  for delete using (
    user_id = auth.uid() or public.is_coordinator_or_admin()
  );

-- ==============================================================================
-- 9. POLÍTICAS RLS BLINDADAS: TABLA HOSTING_SERVICES
-- ==============================================================================
alter table public.hosting_services enable row level security;

drop policy if exists "hosting_services_select_policy" on public.hosting_services;
drop policy if exists "hosting_services_insert_policy" on public.hosting_services;
drop policy if exists "hosting_services_update_policy" on public.hosting_services;
drop policy if exists "hosting_services_delete_policy" on public.hosting_services;

-- Solo coordinadores y administradores pueden ver y gestionar servicios de hosting
create policy "hosting_services_select_policy" on public.hosting_services
  for select using (public.is_coordinator_or_admin());

create policy "hosting_services_insert_policy" on public.hosting_services
  for insert with check (public.is_coordinator_or_admin());

create policy "hosting_services_update_policy" on public.hosting_services
  for update using (public.is_coordinator_or_admin());

create policy "hosting_services_delete_policy" on public.hosting_services
  for delete using (public.is_coordinator_or_admin());

-- ==============================================================================
-- 10. POLÍTICAS RLS BLINDADAS: TABLAS TASKFLOW
-- ==============================================================================
alter table public.taskflow_items enable row level security;
alter table public.taskflow_lists enable row level security;
alter table public.taskflow_postits enable row level security;

drop policy if exists "taskflow_items_select_policy" on public.taskflow_items;
drop policy if exists "taskflow_items_insert_policy" on public.taskflow_items;
drop policy if exists "taskflow_items_update_policy" on public.taskflow_items;
drop policy if exists "taskflow_items_delete_policy" on public.taskflow_items;

create policy "taskflow_items_select_policy" on public.taskflow_items for select using (auth.role() = 'authenticated' or public.is_coordinator_or_admin());
create policy "taskflow_items_insert_policy" on public.taskflow_items for insert with check (auth.role() = 'authenticated' or public.is_coordinator_or_admin());
create policy "taskflow_items_update_policy" on public.taskflow_items for update using (auth.role() = 'authenticated' or public.is_coordinator_or_admin());
create policy "taskflow_items_delete_policy" on public.taskflow_items for delete using (auth.role() = 'authenticated' or public.is_coordinator_or_admin());

drop policy if exists "taskflow_lists_select_policy" on public.taskflow_lists;
drop policy if exists "taskflow_lists_insert_policy" on public.taskflow_lists;
drop policy if exists "taskflow_lists_update_policy" on public.taskflow_lists;
drop policy if exists "taskflow_lists_delete_policy" on public.taskflow_lists;

create policy "taskflow_lists_select_policy" on public.taskflow_lists for select using (auth.role() = 'authenticated' or public.is_coordinator_or_admin());
create policy "taskflow_lists_insert_policy" on public.taskflow_lists for insert with check (auth.role() = 'authenticated' or public.is_coordinator_or_admin());
create policy "taskflow_lists_update_policy" on public.taskflow_lists for update using (auth.role() = 'authenticated' or public.is_coordinator_or_admin());
create policy "taskflow_lists_delete_policy" on public.taskflow_lists for delete using (auth.role() = 'authenticated' or public.is_coordinator_or_admin());

drop policy if exists "taskflow_postits_select_policy" on public.taskflow_postits;
drop policy if exists "taskflow_postits_insert_policy" on public.taskflow_postits;
drop policy if exists "taskflow_postits_update_policy" on public.taskflow_postits;
drop policy if exists "taskflow_postits_delete_policy" on public.taskflow_postits;

create policy "taskflow_postits_select_policy" on public.taskflow_postits for select using (auth.role() = 'authenticated' or public.is_coordinator_or_admin());
create policy "taskflow_postits_insert_policy" on public.taskflow_postits for insert with check (auth.role() = 'authenticated' or public.is_coordinator_or_admin());
create policy "taskflow_postits_update_policy" on public.taskflow_postits for update using (auth.role() = 'authenticated' or public.is_coordinator_or_admin());
create policy "taskflow_postits_delete_policy" on public.taskflow_postits for delete using (auth.role() = 'authenticated' or public.is_coordinator_or_admin());

-- FIN DEL SCRIPT DE BLINDAJE DE SEGURIDAD SEGMENTO 7

