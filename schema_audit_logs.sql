-- ==============================================================================
-- SISTEMA DE AUDITORÍA INMUTABLE (WORM: WRITE ONCE, READ MANY)
-- Suite Corporativa: Brain Up Grup (BUG clockify)
-- Fecha: 13 de Noviembre de 2026
--
-- OBJETIVO:
-- 1. Tabla public.audit_logs inmutable para trazabilidad forense de eventos de seguridad.
-- 2. Trigger que prohíbe terminantemente cualquier UPDATE o DELETE (a prueba de borrado).
-- 3. Triggers automáticos en profiles, companies y profile_passwords.
-- 4. RPC public.log_audit_event() (SECURITY DEFINER) para registro desde Next.js / API.
-- 5. RLS: Lectura exclusiva para Coordinadores y Administradores (is_coordinator_or_admin).
--
-- INSTRUCCIONES:
-- 1. Accede a tu panel de Supabase: https://supabase.com/dashboard/project/popypyunzkuyighdyjkc
-- 2. Entra en "SQL Editor" en el menú lateral izquierdo.
-- 3. Pega todo este contenido y pulsa RUN (Ctrl + Enter).
-- ==============================================================================

-- 1. CREACIÓN DE LA TABLA AUDIT_LOGS
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  user_email text not null default 'sistema@brainupgrup.com',
  user_role text not null default 'system',
  action text not null,
  entity_type text not null,
  entity_id text null,
  details jsonb null default '{}'::jsonb,
  ip_address text null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  created_at timestamptz not null default now()
);

-- Índices de alto rendimiento para búsqueda y filtrado de auditoría
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
create index if not exists idx_audit_logs_action on public.audit_logs(action);
create index if not exists idx_audit_logs_severity on public.audit_logs(severity);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);

-- 2. TRIGGER DE INMUTABILIDAD CRIPTOGRÁFICA (BLOQUEO DE UPDATE Y DELETE)
create or replace function public.prevent_audit_logs_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'VIOLACIÓN DE SEGURIDAD (WORM): La tabla audit_logs es inmutable y no permite modificaciones ni borrado de registros históricos.';
end;
$$;

drop trigger if exists tr_prevent_audit_logs_mutation on public.audit_logs;
create trigger tr_prevent_audit_logs_mutation
  before update or delete on public.audit_logs
  for each row execute function public.prevent_audit_logs_mutation();

-- 3. POLÍTICAS RLS (ROW LEVEL SECURITY)
alter table public.audit_logs enable row level security;

-- Revocar permisos de modificación a nivel de permisos de tabla
revoke update, delete on public.audit_logs from public, anon, authenticated;
grant select, insert on public.audit_logs to anon, authenticated, service_role;

drop policy if exists "audit_logs_select_policy" on public.audit_logs;
drop policy if exists "audit_logs_insert_policy" on public.audit_logs;
drop policy if exists "audit_logs_update_policy" on public.audit_logs;
drop policy if exists "audit_logs_delete_policy" on public.audit_logs;

-- Lectura: Exclusiva para Coordinadores y Administradores
create policy "audit_logs_select_policy" on public.audit_logs
  for select using (public.is_coordinator_or_admin());

-- Inserción: Permitida para registrar eventos
create policy "audit_logs_insert_policy" on public.audit_logs
  for insert with check (true);

-- Modificación y Borrado: Rechazados siempre
create policy "audit_logs_update_policy" on public.audit_logs
  for update using (false);

create policy "audit_logs_delete_policy" on public.audit_logs
  for delete using (false);

-- 4. FUNCIÓN RPC PARA REGISTRAR EVENTOS DESDE NEXT.JS O SERVIDOR
create or replace function public.log_audit_event(
  p_user_id uuid default null,
  p_user_email text default 'sistema@brainupgrup.com',
  p_user_role text default 'system',
  p_action text default 'UNKNOWN_ACTION',
  p_entity_type text default 'general',
  p_entity_id text default null,
  p_details jsonb default '{}'::jsonb,
  p_ip_address text default null,
  p_severity text default 'info'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_id uuid;
begin
  insert into public.audit_logs (
    user_id,
    user_email,
    user_role,
    action,
    entity_type,
    entity_id,
    details,
    ip_address,
    severity,
    created_at
  ) values (
    p_user_id,
    coalesce(p_user_email, 'sistema@brainupgrup.com'),
    coalesce(p_user_role, 'system'),
    p_action,
    p_entity_type,
    p_entity_id,
    coalesce(p_details, '{}'::jsonb),
    p_ip_address,
    coalesce(p_severity, 'info'),
    now()
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

grant execute on function public.log_audit_event(uuid, text, text, text, text, text, jsonb, text, text) to anon, authenticated, service_role;

-- 5. TRIGGER AUTOMÁTICO EN PROFILES (AUDITORÍA DE ROLES, ESTADO Y PERFILES)
create or replace function public.trigger_audit_profiles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_severity text := 'info';
  v_details jsonb;
begin
  if TG_OP = 'INSERT' then
    v_action := 'USER_REGISTERED';
    v_details := jsonb_build_object(
      'full_name', NEW.full_name,
      'email', NEW.email,
      'role', NEW.role,
      'status', NEW.status,
      'department', NEW.department
    );
    if NEW.status = 'pending' then
      v_severity := 'warning';
    end if;

    insert into public.audit_logs (user_id, user_email, user_role, action, entity_type, entity_id, details, severity)
    values (NEW.id, NEW.email, NEW.role, v_action, 'profiles', NEW.id::text, v_details, v_severity);

    return NEW;

  elsif TG_OP = 'UPDATE' then
    v_action := 'USER_UPDATED';
    
    if OLD.role is distinct from NEW.role then
      v_action := 'USER_ROLE_CHANGED';
      v_severity := 'critical';
    elsif OLD.status is distinct from NEW.status then
      v_action := 'USER_STATUS_CHANGED';
      v_severity := case when NEW.status = 'active' then 'info' else 'warning' end;
    end if;

    v_details := jsonb_build_object(
      'old_role', OLD.role,
      'new_role', NEW.role,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'old_full_name', OLD.full_name,
      'new_full_name', NEW.full_name,
      'old_department', OLD.department,
      'new_department', NEW.department
    );

    insert into public.audit_logs (user_id, user_email, user_role, action, entity_type, entity_id, details, severity)
    values (NEW.id, NEW.email, NEW.role, v_action, 'profiles', NEW.id::text, v_details, v_severity);

    return NEW;

  elsif TG_OP = 'DELETE' then
    v_action := 'USER_DELETED';
    v_severity := 'critical';
    v_details := jsonb_build_object('email', OLD.email, 'full_name', OLD.full_name, 'role', OLD.role);

    insert into public.audit_logs (user_id, user_email, user_role, action, entity_type, entity_id, details, severity)
    values (OLD.id, OLD.email, OLD.role, v_action, 'profiles', OLD.id::text, v_details, v_severity);

    return OLD;
  end if;

  return null;
end;
$$;

drop trigger if exists tr_audit_profiles on public.profiles;
create trigger tr_audit_profiles
  after insert or update or delete on public.profiles
  for each row execute function public.trigger_audit_profiles();

-- 6. TRIGGER AUTOMÁTICO EN COMPANIES (AUDITORÍA DE CLIENTES Y CUOTAS)
create or replace function public.trigger_audit_companies()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_details jsonb;
begin
  if TG_OP = 'INSERT' then
    v_action := 'COMPANY_CREATED';
    v_details := jsonb_build_object('name', NEW.name, 'client_type', NEW.client_type, 'monthly_hours_quota', NEW.monthly_hours_quota);
    
    insert into public.audit_logs (user_email, user_role, action, entity_type, entity_id, details, severity)
    values ('coordinacion@brainupgrup.com', 'coordinator', v_action, 'companies', NEW.id::text, v_details, 'info');

    return NEW;

  elsif TG_OP = 'UPDATE' then
    v_action := 'COMPANY_UPDATED';
    v_details := jsonb_build_object(
      'old_name', OLD.name, 'new_name', NEW.name,
      'old_quota', OLD.monthly_hours_quota, 'new_quota', NEW.monthly_hours_quota,
      'old_active', OLD.is_active, 'new_active', NEW.is_active
    );

    insert into public.audit_logs (user_email, user_role, action, entity_type, entity_id, details, severity)
    values ('coordinacion@brainupgrup.com', 'coordinator', v_action, 'companies', NEW.id::text, v_details, 'info');

    return NEW;

  elsif TG_OP = 'DELETE' then
    v_action := 'COMPANY_DELETED';
    v_details := jsonb_build_object('name', OLD.name);

    insert into public.audit_logs (user_email, user_role, action, entity_type, entity_id, details, severity)
    values ('coordinacion@brainupgrup.com', 'coordinator', v_action, 'companies', OLD.id::text, v_details, 'warning');

    return OLD;
  end if;

  return null;
end;
$$;

drop trigger if exists tr_audit_companies on public.companies;
create trigger tr_audit_companies
  after insert or update or delete on public.companies
  for each row execute function public.trigger_audit_companies();

-- 7. TRIGGER AUTOMÁTICO EN PROFILE_PASSWORDS (CAMBIOS DE CONTRASEÑA SIN REVELAR LA CLAVE)
create or replace function public.trigger_audit_passwords()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_role text;
  v_is_temp boolean;
begin
  select email, role into v_email, v_role from public.profiles where id = NEW.profile_id;
  v_is_temp := NEW.temp_password is not null;

  insert into public.audit_logs (
    user_id,
    user_email,
    user_role,
    action,
    entity_type,
    entity_id,
    details,
    severity
  ) values (
    NEW.profile_id,
    coalesce(v_email, 'usuario@brainupgrup.com'),
    coalesce(v_role, 'employee'),
    case when v_is_temp then 'PASSWORD_TEMP_ASSIGNED' else 'PASSWORD_CHANGED' end,
    'auth',
    NEW.profile_id::text,
    jsonb_build_object('is_temp', v_is_temp, 'has_custom', NEW.custom_password is not null),
    case when v_is_temp then 'warning' else 'info' end
  );

  return NEW;
end;
$$;

drop trigger if exists tr_audit_passwords on public.profile_passwords;
create trigger tr_audit_passwords
  after insert or update on public.profile_passwords
  for each row execute function public.trigger_audit_passwords();

-- 8. REGISTRO INICIAL DE PUESTA EN MARCHA DE LA AUDITORÍA
insert into public.audit_logs (
  user_email,
  user_role,
  action,
  entity_type,
  details,
  severity
) values (
  'appadmin@brainupgrup.com',
  'admin',
  'AUDIT_SYSTEM_INITIALIZED',
  'system',
  jsonb_build_object(
    'version', 'v4.3.4',
    'security_grade', 'Enterprise WORM Immutability',
    'description', 'Tabla audit_logs inmutable activada con proteccion contra modificacion y triggers forenses automaticos.'
  ),
  'info'
);

