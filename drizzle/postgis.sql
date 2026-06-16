-- ════════════════════════════════════════════════════════════
-- AlToque — PostGIS + matching geográfico + RLS
-- Correr en el SQL Editor de Supabase DESPUÉS de `pnpm db:migrate`.
-- (Sección 4 del blueprint)
-- ════════════════════════════════════════════════════════════

create extension if not exists postgis;

-- ── Índices GIST sobre las columnas geography + índices de apoyo ──
create index if not exists idx_provider_base_loc
  on provider_profiles using gist (base_location);
create index if not exists idx_jobs_location
  on jobs using gist (location);
create index if not exists idx_jobs_status
  on jobs (status);
create index if not exists idx_provider_online
  on provider_profiles (is_online, verification_status);

-- ── Check: rating de reviews entre 1 y 5 ──
alter table reviews
  drop constraint if exists reviews_rating_range;
alter table reviews
  add constraint reviews_rating_range check (rating between 1 and 5);

-- ════════════════════════════════════════════════════════════
-- "El profesional más cercano disponible" para un oficio dado.
-- Solo profesionales APROBADOS dentro de su radio de cobertura.
-- ════════════════════════════════════════════════════════════
create or replace function find_nearby_providers(
  p_category uuid,
  p_lng float8,
  p_lat float8,
  p_limit int default 20
) returns table (provider_id uuid, distance_km float8, rating_avg numeric) as $$
  select pp.profile_id,
         st_distance(pp.base_location,
                     st_setsrid(st_makepoint(p_lng, p_lat), 4326)) / 1000.0 as distance_km,
         pp.rating_avg
  from provider_profiles pp
  join provider_categories pc
    on pc.provider_id = pp.profile_id
   and pc.category_id = p_category
  where pp.verification_status = 'approved'
    and pp.base_location is not null
    and st_dwithin(pp.base_location,
                   st_setsrid(st_makepoint(p_lng, p_lat), 4326),
                   pp.service_radius_km * 1000)
  order by distance_km asc
  limit p_limit;
$$ language sql stable;

-- ── Variante URGENTE: además exige is_online = true ──
create or replace function find_nearby_online_providers(
  p_category uuid,
  p_lng float8,
  p_lat float8,
  p_limit int default 20
) returns table (provider_id uuid, distance_km float8, rating_avg numeric) as $$
  select pp.profile_id,
         st_distance(pp.base_location,
                     st_setsrid(st_makepoint(p_lng, p_lat), 4326)) / 1000.0 as distance_km,
         pp.rating_avg
  from provider_profiles pp
  join provider_categories pc
    on pc.provider_id = pp.profile_id
   and pc.category_id = p_category
  where pp.verification_status = 'approved'
    and pp.is_online = true
    and pp.base_location is not null
    and st_dwithin(pp.base_location,
                   st_setsrid(st_makepoint(p_lng, p_lat), 4326),
                   pp.service_radius_km * 1000)
  order by distance_km asc
  limit p_limit;
$$ language sql stable;

-- ════════════════════════════════════════════════════════════
-- Helpers de rol (el `role` viaja como custom claim en el JWT)
-- ════════════════════════════════════════════════════════════
create or replace function auth_role() returns text as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'user_role', ''),
    (select role::text from profiles where id = auth.uid())
  );
$$ language sql stable;

create or replace function is_admin() returns boolean as $$
  select auth_role() = 'admin';
$$ language sql stable;

-- ════════════════════════════════════════════════════════════
-- Row Level Security — habilitar en TODAS las tablas
-- ════════════════════════════════════════════════════════════
alter table profiles            enable row level security;
alter table provider_profiles   enable row level security;
alter table provider_mp_tokens  enable row level security;
alter table categories          enable row level security;
alter table provider_categories enable row level security;
alter table jobs                enable row level security;
alter table job_dispatch        enable row level security;
alter table reviews             enable row level security;
alter table messages            enable row level security;
alter table commission_ledger   enable row level security;
alter table push_subscriptions  enable row level security;
alter table notifications       enable row level security;

-- profiles: cada uno lee/edita el suyo; los perfiles son visibles para mostrar.
drop policy if exists profiles_self_rw on profiles;
create policy profiles_self_rw on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists profiles_public_read on profiles;
create policy profiles_public_read on profiles
  for select using (true);

-- provider_profiles: el profesional edita el suyo; lectura pública (solo se
-- muestran en búsquedas los 'approved', filtrado por la función/queries).
drop policy if exists provider_self_rw on provider_profiles;
create policy provider_self_rw on provider_profiles
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
drop policy if exists provider_public_read on provider_profiles;
create policy provider_public_read on provider_profiles
  for select using (true);

-- provider_mp_tokens: SOLO service_role (sin policies → nadie con anon/auth accede).
-- (RLS habilitado y sin policy = denegado para roles no service_role.)

-- categories: lectura pública; escritura solo admin.
drop policy if exists categories_read on categories;
create policy categories_read on categories for select using (true);
drop policy if exists categories_admin_write on categories;
create policy categories_admin_write on categories
  for all using (is_admin()) with check (is_admin());

-- provider_categories: el profesional gestiona las suyas; lectura pública.
drop policy if exists provcat_self_rw on provider_categories;
create policy provcat_self_rw on provider_categories
  for all using (auth.uid() = provider_id) with check (auth.uid() = provider_id);
drop policy if exists provcat_read on provider_categories;
create policy provcat_read on provider_categories for select using (true);

-- jobs: el cliente gestiona los suyos; el profesional asignado o en broadcast lee.
drop policy if exists jobs_client_rw on jobs;
create policy jobs_client_rw on jobs
  for all using (auth.uid() = client_id) with check (auth.uid() = client_id);
drop policy if exists jobs_provider_read on jobs;
create policy jobs_provider_read on jobs
  for select using (
    auth.uid() = provider_id
    or (status = 'broadcasting' and exists (
      select 1 from job_dispatch d
      where d.job_id = jobs.id and d.provider_id = auth.uid()
    ))
  );
-- El profesional puede aceptar/actualizar el job que le corresponde.
drop policy if exists jobs_provider_update on jobs;
create policy jobs_provider_update on jobs
  for update using (
    auth.uid() = provider_id
    or (status = 'broadcasting' and exists (
      select 1 from job_dispatch d
      where d.job_id = jobs.id and d.provider_id = auth.uid()
    ))
  );
drop policy if exists jobs_admin_all on jobs;
create policy jobs_admin_all on jobs
  for all using (is_admin()) with check (is_admin());

-- job_dispatch: el profesional ve/actualiza sus propias filas; el cliente del job lee.
drop policy if exists dispatch_provider_rw on job_dispatch;
create policy dispatch_provider_rw on job_dispatch
  for all using (auth.uid() = provider_id) with check (auth.uid() = provider_id);
drop policy if exists dispatch_client_read on job_dispatch;
create policy dispatch_client_read on job_dispatch
  for select using (
    exists (select 1 from jobs j where j.id = job_dispatch.job_id and j.client_id = auth.uid())
  );

-- reviews: lectura pública; el autor crea la suya.
drop policy if exists reviews_read on reviews;
create policy reviews_read on reviews for select using (true);
drop policy if exists reviews_author_write on reviews;
create policy reviews_author_write on reviews
  for insert with check (auth.uid() = author_id);

-- messages: solo las partes del job (cliente o profesional asignado).
drop policy if exists messages_parties_rw on messages;
create policy messages_parties_rw on messages
  for all using (
    exists (
      select 1 from jobs j
      where j.id = messages.job_id
        and (j.client_id = auth.uid() or j.provider_id = auth.uid())
    )
  ) with check (auth.uid() = sender_id);

-- commission_ledger: el profesional ve su deuda/cobros; admin todo.
drop policy if exists ledger_provider_read on commission_ledger;
create policy ledger_provider_read on commission_ledger
  for select using (auth.uid() = provider_id or is_admin());
drop policy if exists ledger_admin_write on commission_ledger;
create policy ledger_admin_write on commission_ledger
  for all using (is_admin()) with check (is_admin());

-- push_subscriptions / notifications: cada usuario las suyas.
drop policy if exists push_self_rw on push_subscriptions;
create policy push_self_rw on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists notif_self_rw on notifications;
create policy notif_self_rw on notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════
-- Realtime: publicar cambios de jobs, job_dispatch y messages
-- (feed del profesional, timeline del cliente, chat).
-- ════════════════════════════════════════════════════════════
alter publication supabase_realtime add table jobs;
alter publication supabase_realtime add table job_dispatch;
alter publication supabase_realtime add table messages;
