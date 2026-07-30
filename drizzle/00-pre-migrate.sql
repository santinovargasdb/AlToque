-- ════════════════════════════════════════════════════════════
-- AlToque — PRE-migración. Correr en Supabase → SQL Editor
-- ANTES de `pnpm db:migrate`, en una base nueva.
--
-- Por qué: la migración 0000 crea columnas `geography(Point, 4326)`
-- (jobs.location y provider_profiles.base_location) pero NO habilita
-- PostGIS — eso vive en drizzle/postgis.sql, que se corre después.
-- Sin esto, `db:migrate` falla con: type "geography" does not exist.
-- ════════════════════════════════════════════════════════════

create extension if not exists postgis;

-- Verificación: debe devolver una fila.
select extname, extversion from pg_extension where extname = 'postgis';
