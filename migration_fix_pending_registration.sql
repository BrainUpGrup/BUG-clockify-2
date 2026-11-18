-- ==============================================================================
-- MIGRACIÓN: Blindar registros por enlace en estado 'pending' hasta validación
-- Uso: Ejecutar en Supabase > SQL Editor
-- ==============================================================================

-- 1. Cambiar el default de status en public.profiles a 'pending'
alter table public.profiles
  alter column status set default 'pending';

-- 2. Reafirmar trigger on_auth_user_created para que nunca cree cuentas 'active'
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

  insert into public.profiles (id, full_name, email, role, status, department, created_at)
  values (new.id, v_full_name, new.email, 'employee', 'pending', v_dept, now())
  on conflict (id) do update
  set full_name = excluded.full_name,
      email = excluded.email;

  return new;
exception
  when unique_violation then
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Pasar la cuenta recién probada al apartado de validación de coordinadora
update public.profiles
set status = 'pending'
where lower(trim(email)) = 'malgarilgbis@hotmail.com';
