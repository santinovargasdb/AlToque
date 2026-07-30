-- ════════════════════════════════════════════════════════════
-- AlToque — Backfill de profiles para usuarios ya existentes.
--
-- Por qué: el trigger `on_auth_user_created` (drizzle/auth-triggers.sql)
-- solo dispara en INSERT. Las cuentas que se registraron ANTES de que
-- existiera el schema quedaron en auth.users sin fila en profiles →
-- getSession() devuelve profile undefined y el onboarding nunca cierra.
--
-- Correr UNA VEZ, después de auth-triggers.sql. Idempotente.
-- ════════════════════════════════════════════════════════════

insert into public.profiles (id, role, full_name, phone)
select u.id,
       coalesce((u.raw_user_meta_data ->> 'role')::public.role, 'client'),
       u.raw_user_meta_data ->> 'full_name',
       u.raw_user_meta_data ->> 'phone'
from auth.users u
on conflict (id) do nothing;

-- Los que se registraron como profesional necesitan su provider_profiles.
insert into public.provider_profiles (profile_id)
select p.id from public.profiles p where p.role = 'provider'
on conflict (profile_id) do nothing;

-- Verificación: los dos números tienen que coincidir.
select (select count(*) from auth.users)      as usuarios_auth,
       (select count(*) from public.profiles) as perfiles;
