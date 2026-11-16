-- ==============================================================================
-- CIERRE SEGURO DE BÓVEDA DE CONTRASEÑAS (100% ZERO-LOSS) • BRAIN UP CLOCKIFY
-- Suite Corporativa: Brain Up Grup
--
-- QUÉ HACE:
--  1. Respalda en `profile_passwords` cualquier contraseña suelta que hubiera en
--     `profiles` SIN sobrescribir jamás ninguna contraseña ya existente.
--  2. Garantiza el trigger `tr_vault_profile_passwords` (SECURITY DEFINER) para que
--     /register, Admin y Coordinación sigan guardando contraseñas sin fallos.
--  3. Revoca el acceso público REST (`anon` / `authenticated`) sobre `profile_passwords`
--     para eliminar la fuga en texto plano sin tocar `profiles`, `time_entries`,
--     `companies` ni las funciones de login/cambio de clave.
-- ==============================================================================

-- 1. ASEGURAR RESPALDO DE CUALQUIER CONTRASEÑA EN `profiles` SIN SOBRESCRIBIR EXISTENTES
insert into public.profile_passwords (profile_id, custom_password, temp_password, updated_at)
select
  id,
  nullif(trim(custom_password), ''),
  nullif(trim(temp_password), ''),
  now()
from public.profiles
where nullif(trim(custom_password), '') is not null
   or nullif(trim(temp_password), '') is not null
on conflict (profile_id) do update
set custom_password = coalesce(nullif(trim(profile_passwords.custom_password), ''), excluded.custom_password),
    temp_password   = coalesce(nullif(trim(profile_passwords.temp_password), ''), excluded.temp_password),
    updated_at      = now();

-- 2. GARANTIZAR TRIGGER SECURITY DEFINER EN `profiles` (ENCAMINAMIENTO AUTOMÁTICO)
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
      nullif(trim(new.custom_password), ''),
      nullif(trim(new.temp_password), ''),
      now()
    )
    on conflict (profile_id) do update
    set custom_password = coalesce(nullif(trim(excluded.custom_password), ''), profile_passwords.custom_password),
        temp_password   = excluded.temp_password,
        updated_at      = now();
  end if;

  -- Mantener las columnas en `profiles` limpias tras copiarlas a la bóveda
  new.custom_password := null;
  new.temp_password := null;
  return new;
end;
$$;

drop trigger if exists tr_vault_profile_passwords on public.profiles;
create trigger tr_vault_profile_passwords
  before insert or update on public.profiles
  for each row execute function public.vault_profile_passwords_trigger();

-- Limpiar restos en claro de `profiles` solo ahora que ya están respaldados
update public.profiles
set custom_password = null,
    temp_password = null
where custom_password is not null
   or temp_password is not null;

-- 3. CERRAR ÚNICAMENTE EL ACCESO PÚBLICO REST A `public.profile_passwords`
-- (Las RPCs SECURITY DEFINER `authenticate_employee` y `admin_set_user_password`
--  y el trigger siguen funcionando con normalidad total.)
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profile_passwords'
  loop
    execute format('drop policy if exists %I on public.profile_passwords', pol.policyname);
  end loop;

  alter table public.profile_passwords enable row level security;
  create policy "profile_passwords_lock" on public.profile_passwords
    for all using (false) with check (false);
end $$;

revoke all on public.profile_passwords from anon, authenticated;
grant all on public.profile_passwords to service_role;
