-- ════════════════════════════════════════════════════════════
-- AlToque — Rate limiting sobre Postgres (sin Redis / sin servicios externos)
-- Correr UNA vez en el SQL Editor de Supabase.
--
-- La app cuenta los intentos de login/registro/reset acá, server-side vía
-- Drizzle (ventana fija atómica con `on conflict`). Hasta que esta tabla
-- exista, el rate limit es no-op (fail-open): no bloquea nada.
-- ════════════════════════════════════════════════════════════

create table if not exists rate_limits (
  id          text primary key,          -- clave: "login:<ip>:<email>", etc.
  count       integer not null default 0,
  expires_at  timestamptz not null       -- fin de la ventana; al pasar, resetea
);

create index if not exists idx_rate_limits_expires
  on rate_limits (expires_at);

-- Solo acceso server-side: Drizzle usa el rol owner (bypassa RLS). Con RLS
-- habilitado y SIN policies, el navegador (anon/authenticated) no puede leer
-- ni escribir esta tabla.
alter table rate_limits enable row level security;

-- Opcional (higiene): borrar filas vencidas cada tanto. Se puede automatizar
-- con pg_cron en Supabase, o correrlo a mano de vez en cuando:
--   delete from rate_limits where expires_at < now();
