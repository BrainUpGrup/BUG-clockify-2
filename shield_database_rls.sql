-- ==============================================================================
-- BRAIN UP CLOCKIFY & HUB • SCRIPT DE BLINDAJE DE SEGURIDAD (FASE 1: RLS)
-- ==============================================================================
-- Este script blinda de forma integral todas las tablas de Supabase PostgreSQL,
-- activando Row Level Security (RLS) estricto, revocando lecturas anónimas
-- sobre contraseñas en texto claro y cerrando los accesos permisivos.
--
-- INSTRUCCIONES:
-- 1. Accede a tu panel de Supabase: https://supabase.com/dashboard/project/popypyunzkuyighdyjkc
-- 2. Dirígete a la sección "SQL Editor" (icono de terminal en el menú izquierdo).
-- 3. Pega y ejecuta la totalidad de este script.
-- ==============================================================================

-- 1. EXTENSIÓN CRIPTOGRÁFICA
create extension if not exists "pgcrypto";

-- 2. FUNCIONES DE SEGURIDAD ENCAPSULADAS (SECURITY DEFINER + search_path seguro)
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
      and status = 'active'
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
      and status = 'active'
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
      and status = 'active'
  );
$$;

create or replace function public.is_active_user()
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
      and status = 'active'
  );
$$;

-- 3. FUNCIÓN RPC PARA AUTENTICACIÓN SEGURA DE EMPLEADOS
-- Permite validar el login sin exponer la columna custom_password a consultas SELECT del cliente
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
grant execute on function public.is_coordinator() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_coordinator_or_admin() to anon, authenticated;
grant execute on function public.is_active_user() to anon, authenticated;

-- ==============================================================================
-- 4. TABLA: profiles (PROTECCIÓN TOTAL Y AISLAMIENTO DE CREDENCIALES)
-- ==============================================================================
alter table public.profiles enable row level security;

-- Eliminar políticas antiguas o permisivas
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_select_policy" on public.profiles;
drop policy if exists "profiles_insert_registration" on public.profiles;
drop policy if exists "profiles_update_policy" on public.profiles;
drop policy if exists "profiles_update_self_or_coordinator" on public.profiles;
drop policy if exists "profiles_delete_policy" on public.profiles;
drop policy if exists "profiles_delete_coordinator" on public.profiles;

-- Lectura: Solo usuarios autenticados con cuenta activa o el propio usuario
create policy "profiles_select_policy" on public.profiles
  for select using (
    auth.uid() = id 
    or (auth.uid() is not null and public.is_active_user())
  );

-- Inserción: Registro de nuevos empleados vía enlace (estrictamente rol employee y status pending)
create policy "profiles_insert_registration" on public.profiles
  for insert with check (
    (role = 'employee' and status = 'pending')
    or public.is_coordinator_or_admin()
  );

-- Modificación: Solo el propio usuario sobre sus datos básicos o coordinadores/admins
create policy "profiles_update_policy" on public.profiles
  for update using (
    auth.uid() = id or public.is_coordinator_or_admin()
  )
  with check (
    -- El propio usuario no puede cambiarse su rol ni su estado
    (auth.uid() = id 
     and role = (select p.role from public.profiles p where p.id = auth.uid()) 
     and status = (select p.status from public.profiles p where p.id = auth.uid()))
    or public.is_coordinator_or_admin()
  );

-- Eliminación: Exclusivamente coordinadores o administradores
create policy "profiles_delete_policy" on public.profiles
  for delete using (
    public.is_coordinator_or_admin()
  );

-- Blindaje a nivel de columna: Bloquea extracción anónima de contraseñas
revoke select (custom_password, temp_password) on public.profiles from anon;

-- Trigger anti-escalada de privilegios
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

-- ==============================================================================
-- 5. TABLA: companies (CLIENTES Y CUOTAS)
-- ==============================================================================
alter table public.companies enable row level security;

drop policy if exists "companies_select_policy" on public.companies;
drop policy if exists "companies_insert_policy" on public.companies;
drop policy if exists "companies_update_policy" on public.companies;
drop policy if exists "companies_delete_policy" on public.companies;

create policy "companies_select_policy" on public.companies
  for select using (
    auth.uid() is not null and public.is_active_user()
  );

create policy "companies_insert_policy" on public.companies
  for insert with check (
    public.is_coordinator_or_admin()
  );

create policy "companies_update_policy" on public.companies
  for update using (
    public.is_coordinator_or_admin()
  );

create policy "companies_delete_policy" on public.companies
  for delete using (
    public.is_coordinator_or_admin()
  );

-- ==============================================================================
-- 6. TABLA: time_entries (REGISTROS HORARIOS CON AISLAMIENTO ESTRICTO)
-- ==============================================================================
alter table public.time_entries enable row level security;

drop policy if exists "time_entries_select_policy" on public.time_entries;
drop policy if exists "time_entries_insert_policy" on public.time_entries;
drop policy if exists "time_entries_update_policy" on public.time_entries;
drop policy if exists "time_entries_delete_policy" on public.time_entries;

create policy "time_entries_select_policy" on public.time_entries
  for select using (
    auth.uid() is not null and (
      auth.uid() = user_id or public.is_coordinator_or_admin()
    )
  );

create policy "time_entries_insert_policy" on public.time_entries
  for insert with check (
    auth.uid() is not null and (
      auth.uid() = user_id or public.is_coordinator_or_admin()
    )
  );

create policy "time_entries_update_policy" on public.time_entries
  for update using (
    auth.uid() is not null and (
      auth.uid() = user_id or public.is_coordinator_or_admin()
    )
  );

create policy "time_entries_delete_policy" on public.time_entries
  for delete using (
    auth.uid() is not null and (
      auth.uid() = user_id or public.is_coordinator_or_admin()
    )
  );

-- ==============================================================================
-- 7. TABLA: hosting_services (HOSTING & DOMINIOS - CIERRE DE ACCESO ANÓNIMO)
-- ==============================================================================
alter table public.hosting_services enable row level security;

drop policy if exists "hosting_all_policy" on public.hosting_services;
drop policy if exists "hosting_select_policy" on public.hosting_services;
drop policy if exists "hosting_insert_policy" on public.hosting_services;
drop policy if exists "hosting_update_policy" on public.hosting_services;
drop policy if exists "hosting_delete_policy" on public.hosting_services;

create policy "hosting_select_policy" on public.hosting_services
  for select using (
    auth.uid() is not null and public.is_active_user()
  );

create policy "hosting_insert_policy" on public.hosting_services
  for insert with check (
    public.is_coordinator_or_admin()
  );

create policy "hosting_update_policy" on public.hosting_services
  for update using (
    public.is_coordinator_or_admin()
  );

create policy "hosting_delete_policy" on public.hosting_services
  for delete using (
    public.is_coordinator_or_admin()
  );

-- ==============================================================================
-- 8. TABLAS DE TASKFLOW: items, lists, postits (CIERRE DE ACCESO ANÓNIMO)
-- ==============================================================================
alter table public.taskflow_items enable row level security;
alter table public.taskflow_lists enable row level security;
alter table public.taskflow_postits enable row level security;

drop policy if exists "taskflow_items_all_policy" on public.taskflow_items;
drop policy if exists "taskflow_items_select_policy" on public.taskflow_items;
drop policy if exists "taskflow_items_insert_policy" on public.taskflow_items;
drop policy if exists "taskflow_items_update_policy" on public.taskflow_items;
drop policy if exists "taskflow_items_delete_policy" on public.taskflow_items;

create policy "taskflow_items_select_policy" on public.taskflow_items
  for select using (
    auth.uid() is not null and public.is_active_user()
  );

create policy "taskflow_items_insert_policy" on public.taskflow_items
  for insert with check (
    auth.uid() is not null and public.is_active_user()
  );

create policy "taskflow_items_update_policy" on public.taskflow_items
  for update using (
    auth.uid() is not null and public.is_active_user()
  );

create policy "taskflow_items_delete_policy" on public.taskflow_items
  for delete using (
    auth.uid() is not null and public.is_active_user()
  );

drop policy if exists "taskflow_lists_all_policy" on public.taskflow_lists;
drop policy if exists "taskflow_lists_select_policy" on public.taskflow_lists;
drop policy if exists "taskflow_lists_insert_policy" on public.taskflow_lists;
drop policy if exists "taskflow_lists_update_policy" on public.taskflow_lists;
drop policy if exists "taskflow_lists_delete_policy" on public.taskflow_lists;

create policy "taskflow_lists_select_policy" on public.taskflow_lists
  for select using (
    auth.uid() is not null and public.is_active_user()
  );

create policy "taskflow_lists_insert_policy" on public.taskflow_lists
  for insert with check (
    auth.uid() is not null and public.is_active_user()
  );

create policy "taskflow_lists_update_policy" on public.taskflow_lists
  for update using (
    auth.uid() is not null and public.is_active_user()
  );

create policy "taskflow_lists_delete_policy" on public.taskflow_lists
  for delete using (
    auth.uid() is not null and public.is_active_user()
  );

drop policy if exists "taskflow_postits_all_policy" on public.taskflow_postits;
drop policy if exists "taskflow_postits_select_policy" on public.taskflow_postits;
drop policy if exists "taskflow_postits_insert_policy" on public.taskflow_postits;
drop policy if exists "taskflow_postits_update_policy" on public.taskflow_postits;
drop policy if exists "taskflow_postits_delete_policy" on public.taskflow_postits;

create policy "taskflow_postits_select_policy" on public.taskflow_postits
  for select using (
    auth.uid() is not null and public.is_active_user()
  );

create policy "taskflow_postits_insert_policy" on public.taskflow_postits
  for insert with check (
    auth.uid() is not null and public.is_active_user()
  );

create policy "taskflow_postits_update_policy" on public.taskflow_postits
  for update using (
    auth.uid() is not null and public.is_active_user()
  );

create policy "taskflow_postits_delete_policy" on public.taskflow_postits
  for delete using (
    auth.uid() is not null and public.is_active_user()
  );

