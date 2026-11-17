-- ==============================================================================
-- MIGRACIÓN: Corrección de trigger DELETE en audit_logs + Rotación Super Admin
-- Crea/actualiza desarrollo@brainupgrup.com (rol admin) y elimina appadmin@brainupgrup.com
-- Uso: Reemplazar '__PON_AQUI_TU_CONTRASENA__' y ejecutar en Supabase > SQL Editor
-- ==============================================================================

-- 1. Corregir bug de FK en trigger_audit_profiles() al borrar usuarios (AFTER DELETE ya no existe OLD.id en profiles)
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
    values (null, OLD.email, OLD.role, v_action, 'profiles', OLD.id::text, v_details, v_severity);

    return OLD;
  end if;

  return null;
end;
$$;

-- 2. Rotación de Super Administrador
do $$
declare
  v_new_email constant text := 'desarrollo@brainupgrup.com';
  v_old_email constant text := 'appadmin@brainupgrup.com';
  v_password  constant text := '__PON_AQUI_TU_CONTRASENA__';
  v_new_id uuid;
begin
  if v_password = '__PON_AQUI_TU_CONTRASENA__' or trim(v_password) = '' then
    raise exception 'Sustituye __PON_AQUI_TU_CONTRASENA__ antes de ejecutar este script en Supabase SQL Editor.';
  end if;

  select id into v_new_id
  from public.profiles
  where lower(trim(email)) = v_new_email;

  if v_new_id is null then
    insert into public.profiles (
      full_name, email, role, status, department, password_configured, created_at
    ) values (
      'Super Administrador', v_new_email, 'admin', 'active', 'Sistemas & Seguridad', true, now()
    )
    returning id into v_new_id;
  else
    update public.profiles
    set full_name = 'Super Administrador',
        role = 'admin',
        status = 'active',
        department = 'Sistemas & Seguridad',
        password_configured = true
    where id = v_new_id;
  end if;

  insert into public.profile_passwords (profile_id, custom_password, temp_password, updated_at)
  values (v_new_id, v_password, null, now())
  on conflict (profile_id) do update
  set custom_password = excluded.custom_password,
      temp_password = null,
      updated_at = now();

  if to_regprocedure('public.sync_profile_to_auth_user(uuid,text,text,text)') is not null then
    perform public.sync_profile_to_auth_user(v_new_id, v_new_email, v_password, 'admin');
  end if;

  delete from public.profile_passwords
  where profile_id in (select id from public.profiles where lower(trim(email)) = v_old_email);

  delete from public.profiles
  where lower(trim(email)) = v_old_email;

  delete from auth.users
  where lower(trim(email)) = v_old_email;
end $$;
