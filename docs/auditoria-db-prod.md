# Auditoría de la base de producción (Supabase `kjscohighnukjcyztqfi`)

**Fecha:** 2026-07-30 · **Método:** consultas de solo lectura vía Session pooler (psql). No se modificó nada.

## Resumen ejecutivo

La base tiene **dos generaciones del proyecto conviviendo**: las 12 tablas en inglés
coinciden **exactamente** con la migración `0000_careful_cannonball` (columnas, tipos,
defaults, FKs, uniques, índices y los 9 enums), y las 5 tablas en español son restos de
una versión anterior que **ningún código del repo referencia**. Lo único que falta del
lado de Drizzle es la migración `0001` (tabla `audit_logs` + columna `notifications.link`)
y el journal (`drizzle.__drizzle_migrations` no existe).

Hallazgos que requieren acción independientemente de la decisión de migración:

1. **🔴 Seguridad — `provider_mp_tokens` tiene una policy `Enable read access for all
   users` (`FOR ALL`, rol `public`, `USING (true)`)**. El diseño exige RLS habilitado y
   CERO policies (solo service_role). Hoy la tabla tiene 0 filas, así que no hubo fuga,
   pero en cuanto un profesional conecte MP sus tokens quedarían legibles (y escribibles)
   por cualquier cliente anon/authenticated vía API REST. Hay que dropear esa policy.
2. **🔴 El trigger `on_auth_user_created` apunta a la función VIEJA**. Está enabled, pero
   ejecuta `crear_perfil_usuario_nuevo` (generación española → inserta en `perfiles`),
   no `handle_new_user`. La función `handle_new_user` correcta está deployada pero
   huérfana: ningún trigger la llama. Consecuencia real: el usuario registrado el
   2026-07-29 tiene fila en `perfiles` y **no** en `profiles` → `getSession()` no le
   encuentra perfil. Hay que re-correr la parte del trigger de `drizzle/auth-triggers.sql`
   y después `drizzle/backfill-profiles.sql`.
3. 🟡 Falta el índice `uq_jobs_mp_payment_id` (idempotencia del webhook de MP, Step 9):
   se corrió una versión de `postgis.sql` anterior a ese agregado.
4. 🟡 `notifications` no está en la publicación `supabase_realtime` (la campanita no
   recibiría INSERTs en vivo) — `docs/audit-notifications-setup.sql` nunca se corrió.

## 1. Las 18 tablas y sus filas

| Tabla | Filas | Estado |
|---|---:|---|
| `categories` | 8 | **Con datos** — seed completo, idéntico a `seed-categories.sql` (slugs e `allows_urgent` coinciden) |
| `profiles` | 3 | **Con datos** — pero 2 de las 3 filas son huérfanas (ver §5) |
| `provider_profiles` | 2 | **Con datos** — corresponden a los 2 profiles huérfanos |
| `perfiles` (ES) | 1 | **Con datos** — la fila es del usuario real registrado el 2026-07-29 (ver §5) |
| `spatial_ref_sys` | 8500 | Datos de referencia de PostGIS (normal, no tocar) |
| `commission_ledger` | 0 | Vacía |
| `job_dispatch` | 0 | Vacía |
| `jobs` | 0 | Vacía |
| `messages` | 0 | Vacía |
| `notifications` | 0 | Vacía |
| `provider_categories` | 0 | Vacía |
| `provider_mp_tokens` | 0 | Vacía |
| `push_subscriptions` | 0 | Vacía |
| `reviews` | 0 | Vacía |
| `categorias` (ES) | 0 | Vacía |
| `mensajes_chat` (ES) | 0 | Vacía |
| `ofertas_bidding` (ES) | 0 | Vacía |
| `servicios` (ES) | 0 | Vacía |

## 2. Comparación columna por columna vs `src/lib/db/schema.ts`

Se compararon las 12 tablas compartidas contra el schema de Drizzle (nombre, tipo,
nullable, default), incluyendo precisión de numerics (`format_type`) y tipo exacto de
geography. **Resultado: coincidencia exacta en todo, con una única diferencia real:**

| Diferencia | Detalle |
|---|---|
| `notifications.link` **no existe** | Es la columna que agrega la migración `0001`. Las otras 8 columnas de `notifications` coinciden. |
| `audit_logs` **no existe** | Es la tabla que crea la migración `0001` (con su índice `idx_audit_user_created`). |

Detalle de los puntos pedidos:

- **`profiles`** ✔️ — `id uuid PK`, `role role NOT NULL DEFAULT 'client'`, `full_name text NULL`,
  `phone text NULL`, `avatar_url text NULL`, `created_at`/`updated_at timestamptz NOT NULL DEFAULT now()`.
  Idéntico al schema.
- **`jobs`** ✔️ — las 25 columnas en el orden y tipo exactos de `0000`:
  `location geography(Point,4326) NULL`, `mp_payment_id text NULL`, `mp_preference_id text NULL`,
  `payment_status payment_status NOT NULL DEFAULT 'none'`, `commission_rate numeric(4,3) NOT NULL`,
  `commission_amount numeric(12,2) NULL`, `price_estimate`/`final_price numeric(12,2)`.
- **`provider_profiles`** ✔️ — `base_location geography(Point,4326) NULL`,
  `rating_avg numeric(2,1) NOT NULL DEFAULT 0.0`, `verification_status` enum con default
  `'pending'`, `mp_user_id`/`mp_connected` presentes. Idéntico.
- **FKs**: las 18 foreign keys de `0000` están todas, con los `ON DELETE` correctos
  (cascade donde corresponde). **Uniques**: `categories_slug_unique`,
  `uq_dispatch_job_provider`, `uq_review_job_author`, `push_subscriptions_endpoint_unique` ✔️.
- **Índices de `0000`**: `idx_jobs_status/client/provider`, `idx_dispatch_provider`,
  `idx_messages_job`, `idx_provider_online`, `idx_reviews_target` ✔️ todos presentes.

## 3. Enums

Los **9 enums existen con exactamente los labels y el orden** de `0000_careful_cannonball.sql`:
`commission_source`, `commission_status`, `dispatch_status`, `job_status`, `job_type`,
`payment_method`, `payment_status`, `role`, `verification_status`. Sin enums sobrantes
(la generación española usaba `varchar` + `CHECK`, no enums).

## 4. Estado de los SQL manuales

| Objeto | Fuente | Estado en prod |
|---|---|---|
| Extensión PostGIS | `00-pre-migrate.sql` / `postgis.sql` | ✔️ 3.3.7 |
| `find_nearby_providers(uuid, float8, float8, int)` | `postgis.sql` | ✔️ existe (sql, stable) |
| `find_nearby_online_providers(...)` | `postgis.sql` | ✔️ existe |
| `auth_role()` / `is_admin()` | `postgis.sql` | ✔️ existen |
| Índices GIST `idx_provider_base_loc`, `idx_jobs_location` | `postgis.sql` | ✔️ existen |
| Check `reviews_rating_range (1–5)` | `postgis.sql` | ✔️ existe |
| RLS habilitado | `postgis.sql` | ✔️ en las 12 tablas inglesas (y también en las 5 españolas) |
| Policies de `postgis.sql` | `postgis.sql` | ✔️ las 21 presentes con sus nombres exactos |
| Realtime: `jobs`, `job_dispatch`, `messages` | `postgis.sql` | ✔️ publicadas |
| **`uq_jobs_mp_payment_id`** | `postgis.sql` (Step 9) | ❌ **FALTA** — se corrió una versión vieja del archivo |
| `handle_new_user()` (inserta en `profiles`) | `auth-triggers.sql` | ⚠️ la función existe con el cuerpo correcto, **pero ningún trigger la llama** |
| **Trigger `on_auth_user_created`** | `auth-triggers.sql` | 🔴 existe y está enabled, pero ejecuta `crear_perfil_usuario_nuevo` (función vieja → `perfiles`) |
| `custom_access_token_hook(jsonb)` | `auth-triggers.sql` | ✔️ existe (plpgsql) + policy `auth_admin_read_profiles` ✔️ |
| `touch_updated_at` + `trg_profiles_touch` | `auth-triggers.sql` | ✔️ existen |
| `audit_logs` + RLS `audit_self_read` | `0001` + `audit-notifications-setup.sql` | ❌ **nada aplicado** |
| Realtime: `notifications` | `audit-notifications-setup.sql` | ❌ no publicada |
| Seed de categorías | `seed-categories.sql` | ✔️ aplicado (8/8) |
| **Policy espuria en `provider_mp_tokens`** | — (no viene de ningún SQL del repo) | 🔴 `Enable read access for all users`, `FOR ALL` a `public`, `USING (true)` — **contradice el diseño "solo service_role"; dropear** |

Las 5 tablas españolas tienen sus propias policies viejas (`{authenticated}`) que caerían
con las tablas.

## 5. auth.users vs profiles

- **`auth.users`: 2 usuarios.**
  - `8a24aa69…` (santinovargasdb@…, creado 2026-07-02): ✔️ tiene fila en `profiles`
    (role `client`, sin nombre ni teléfono → onboarding incompleto).
  - `c17cedaf…` (santivargas2007@…, creado 2026-07-29): ❌ **sin fila en `profiles`** —
    tiene fila en `perfiles` (rol `cliente`), creada por el trigger viejo (§4).
- **1 de 2 usuarios auth no tiene `profiles`.** `backfill-profiles.sql` lo resuelve
  (idempotente), una vez corregido el trigger.
- Además, `profiles` tiene **2 filas huérfanas** (providers "de nombre" creados el
  2026-06-16) que **no existen en `auth.users`** — datos de prueba de junio; son las
  mismas 2 filas de `provider_profiles`. Candidatas a limpieza manual (no las toca
  ninguna migración).

## 6. Las 5 tablas en español

| Tabla | Filas | Referencias en el código |
|---|---:|---|
| `perfiles` | 1 (usuario real del 29/7, ver §5) | Ninguna |
| `servicios` | 0 | Ninguna |
| `categorias` | 0 | Ninguna (la ruta `/categorias` del marketing se arma con los slugs de `categories`) |
| `mensajes_chat` | 0 | Ninguna |
| `ofertas_bidding` | 0 | Ninguna |

Se grepeó todo el repo por `perfiles|servicios|categorias|mensajes_chat|ofertas_bidding`:
los únicos matches son la ruta `/categorias` (middleware + landing), prosa en castellano
de comentarios/docs, y un alias SQL (`as perfiles`) en `backfill-profiles.sql` que cuenta
filas de `profiles`. **Ningún acceso a datos usa estas tablas.** Son droppeables una vez
que el trigger apunte a `handle_new_user` y el backfill haya pasado la fila del usuario
del 29/7 a `profiles` (la única data que contienen). El drop debe incluir la función
`crear_perfil_usuario_nuevo` y sus secuencias/policies (caen con `CASCADE`).

## 7. Recomendación: **(A) baseline del journal + migrar solo 0001**

**Razonamiento.** La condición para que un baseline sea seguro es que lo que hay en la
base sea *byte a byte* lo que la migración marcada como aplicada habría creado. Acá se
verificó positivamente: `0000` está aplicada al 100% (columnas con tipos/nullable/defaults
exactos, precisión de numerics, `geography(Point,4326)`, las 18 FKs con sus `ON DELETE`,
uniques, índices y los 9 enums con labels en orden). No hay drift que "esconder" bajo el
baseline; el único faltante es exactamente `0001`, que es aditiva (crea `audit_logs`,
agrega `notifications.link`, crea un índice) y no puede chocar con nada existente.

La opción (B) — rehacer `public` de cero — no compra fidelidad extra (ya la tenemos
verificada) y sí agrega riesgo operativo: `spatial_ref_sys` y las funciones de PostGIS
viven en `public`, así que un `DROP SCHEMA public CASCADE` arrastra la extensión y hay
que rehabilitarla; el trigger de auth queda colgando mientras tanto (registros nuevos
fallarían); se pierden seed + los datos existentes (poca cosa, pero incluye el perfil del
usuario real); y de todos modos habría que re-correr todos los SQL manuales. Todo eso
para llegar al mismo estado final que (A) alcanza sin ventana de rotura.

**Secuencia sugerida para (A)** (no ejecutada — pendiente de tu OK):

1. Baseline del journal (SQL Editor o psql):
   ```sql
   create schema if not exists drizzle;
   create table if not exists drizzle.__drizzle_migrations (
     id serial primary key,
     hash text not null,
     created_at bigint
   );
   -- hash = sha256 (hex) del archivo drizzle/migrations/0000_careful_cannonball.sql
   -- created_at = "when" del _journal.json para 0000: 1781616100122
   insert into drizzle.__drizzle_migrations (hash, created_at)
   values ('<sha256-de-0000>', 1781616100122);
   ```
2. `pnpm db:migrate` con `MIGRATION_DATABASE_URL` → aplica solo `0001` (verificar que el
   journal quede con 2 filas y que aparezcan `audit_logs` y `notifications.link`).
3. **Dropear la policy insegura**: `drop policy "Enable read access for all users" on provider_mp_tokens;`
4. Re-correr `drizzle/auth-triggers.sql` completo (recrea el trigger apuntando a
   `handle_new_user`; su `drop trigger if exists` pisa al viejo) y después
   `drizzle/backfill-profiles.sql` (crea `profiles` para el usuario del 29/7).
5. Re-correr `drizzle/postgis.sql` (idempotente; agrega `uq_jobs_mp_payment_id`) y
   `docs/audit-notifications-setup.sql` (RLS de `audit_logs` + Realtime de `notifications`).
6. Decisión aparte (destructiva, con tu confirmación): drop de las 5 tablas españolas +
   `crear_perfil_usuario_nuevo`, y limpieza de las 2 filas huérfanas de `profiles`/
   `provider_profiles` del 2026-06-16.

---

## ✅ RESUELTO — 2026-07-30

Se ejecutó la opción (A) completa contra prod, con backup previo (`pg_dump -Fc`
local, fuera del repo) y verificación después de cada paso:

1. **Baseline del journal**: `drizzle.__drizzle_migrations` creado con el DDL de
   drizzle e insertada solo la fila de `0000_careful_cannonball` (hash SHA-256 real
   del archivo + `created_at` del `_journal.json`).
2. **`pnpm db:migrate`** aplicó únicamente `0001_bouncy_martin_li` → `audit_logs`,
   `notifications.link` e `idx_audit_user_created`.
3. **Policy insegura dropeada**: `provider_mp_tokens` quedó con RLS habilitado y
   **0 policies** (solo service_role, como exige el diseño).
4. **Trigger corregido**: re-corrido `drizzle/auth-triggers.sql`;
   `on_auth_user_created` ahora ejecuta `public.handle_new_user` (la vieja
   `crear_perfil_usuario_nuevo` quedó huérfana y después se dropeó).
5. **Backfill** (`drizzle/backfill-profiles.sql`): el usuario del 29/7 obtuvo su
   fila en `profiles`.
6. **SQL manuales**: `drizzle/postgis.sql` (agregó `uq_jobs_mp_payment_id`) y
   `docs/audit-notifications-setup.sql` (RLS `audit_self_read` + Realtime de
   `notifications`). Storage: los 3 buckets ya existían, no se tocaron.
7. **Limpieza**: dropeadas las 5 tablas en español + la función vieja, y borradas
   las 2 filas huérfanas de `profiles` (el cascade se llevó sus `provider_profiles`).

**Estado final verificado**: 13 tablas del schema + `spatial_ref_sys`, journal con
`0000`+`0001`, RLS habilitado en todas con las policies de diseño,
`auth.users` = `profiles` = 2 (sin huérfanos en ninguna dirección), y Realtime
publica `jobs`, `job_dispatch`, `messages` y `notifications`.
