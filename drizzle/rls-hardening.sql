-- ════════════════════════════════════════════════════════════
-- AlToque — Policies RLS de las tablas de negocio.
-- Correr en Supabase → SQL Editor, después de postgis.sql y
-- auth-triggers.sql. Idempotente y en una sola transacción.
--
-- Principio: el navegador tiene la clave pública y puede llamar a la API de
-- Supabase sin pasar por las Server Actions. Por eso acá el navegador solo LEE
-- lo que necesita Realtime. Todas las escrituras van por el servidor (Drizzle,
-- rol owner, que bypassa RLS) después de validar sesión, rol y reglas de negocio.
-- Únicas escrituras permitidas al navegador, definidas en otro lado:
-- notifications y push_subscriptions (solo las propias) y categories (solo admin).
-- ════════════════════════════════════════════════════════════
begin;

-- Borra TODAS las policies de estas tablas, no solo las conocidas: las policies
-- permisivas se suman, y una que haya quedado con otro nombre reabriría el hueco.
-- Se conserva la del hook del JWT (auth-triggers.sql).
do $$
declare
  r record;
begin
  for r in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'provider_profiles', 'provider_categories',
                        'jobs', 'job_dispatch', 'reviews', 'review_aspects',
                        'messages', 'subscriptions')
      and policyname <> 'auth_admin_read_profiles'
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ¿El usuario actual es el cliente de este pedido? SECURITY DEFINER a propósito:
-- la policy de `job_dispatch` no puede consultar `jobs` con RLS, porque la de
-- `jobs` consulta `job_dispatch` y Postgres aborta con "infinite recursion".
create or replace function public.is_job_client(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from jobs where id = p_job_id and client_id = auth.uid()
  );
$$;
revoke execute on function public.is_job_client(uuid) from public, anon;
grant execute on function public.is_job_client(uuid) to authenticated;

-- profiles / provider_profiles: solo la fila propia. Tienen teléfonos y rutas
-- de documentos; las páginas públicas los leen desde el servidor, filtrados.
create policy profiles_self_read on profiles
  for select using (auth.uid() = id);

create policy provider_self_read on provider_profiles
  for select using (auth.uid() = profile_id);

-- provider_categories / reviews / review_aspects: datos públicos del perfil.
create policy provcat_read on provider_categories
  for select using (true);

create policy reviews_read on reviews
  for select using (true);

create policy review_aspects_read on review_aspects
  for select using (true);

-- jobs: las partes, y el profesional notificado mientras dura el broadcast.
create policy jobs_parties_read on jobs
  for select using (
    auth.uid() = client_id
    or auth.uid() = provider_id
    or (status = 'broadcasting' and exists (
      select 1 from job_dispatch d
      where d.job_id = jobs.id and d.provider_id = auth.uid()
    ))
    or is_admin()
  );

-- job_dispatch: el profesional sus filas; el cliente las de su pedido.
create policy dispatch_parties_read on job_dispatch
  for select using (
    auth.uid() = provider_id or public.is_job_client(job_id)
  );

-- messages: solo las partes del pedido.
create policy messages_parties_read on messages
  for select using (
    exists (
      select 1 from jobs j
      where j.id = messages.job_id
        and (j.client_id = auth.uid() or j.provider_id = auth.uid())
    )
  );

-- subscriptions: cada uno lee la suya.
create policy subscriptions_self_read on subscriptions
  for select using (auth.uid() = profile_id);

commit;

-- Verificación: las únicas policies de escritura que tienen que aparecer en estas
-- tablas son las de notifications, push_subscriptions y categories.
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and cmd <> 'SELECT'
order by tablename, policyname;
