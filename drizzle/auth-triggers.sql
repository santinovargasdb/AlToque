-- ════════════════════════════════════════════════════════════
-- AlToque — Triggers de Auth (Step 3 del blueprint)
-- Crea la fila `profiles` al registrarse y expone el `role`
-- como custom claim en el JWT para que RLS y el middleware lo lean
-- sin un round-trip extra.
-- Correr en Supabase tras las migraciones de Drizzle.
-- ════════════════════════════════════════════════════════════

-- 1) Crear profiles automáticamente cuando se registra un usuario.
--    El rol y nombre se pasan en raw_user_meta_data al hacer signUp.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::public.role, 'client'),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;

  -- Si es profesional, crear su provider_profiles (status pending).
  if coalesce(new.raw_user_meta_data ->> 'role', 'client') = 'provider' then
    insert into public.provider_profiles (profile_id)
    values (new.id)
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) Custom Access Token Hook: inyecta `user_role` en el JWT.
--    Activarlo en Supabase → Authentication → Hooks → Custom Access Token.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  v_role text;
begin
  select role::text into v_role
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';
  if v_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(v_role));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;

-- 3) Mantener updated_at al día en profiles.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();
