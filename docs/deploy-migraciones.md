# Migraciones a producción (Supabase) — runbook

Estado a 2026-07-29: **la migración `0001_bouncy_martin_li` está pendiente en prod**
(tabla `audit_logs` + columna `notifications.link`), junto con el SQL manual de
`docs/audit-notifications-setup.sql` (RLS + Realtime) y el re-run de
`drizzle/postgis.sql` (índice único `uq_jobs_mp_payment_id` del Step 9a).

---

## 0-bis. Triage del `Application error` en `/inicio` (digest 1603926555)

**El fallo está aislado al camino de Drizzle.** Prueba: todo lo que va por la
API HTTP de Supabase funciona en prod (landing, `/ingresar`, `/registro`, el
middleware), y lo único que rompe es la primera página que toca Postgres por
TCP. La cadena exacta:

```
/inicio → (app)/layout.tsx → requireCompleteProfile()
        → lib/auth.ts getSession()
        → db.select(...).from(profiles)   ← @/lib/db  ← @/lib/env
```

Y el middleware **no** se cae porque su consulta a `profiles` es con supabase-js
e ignora el error (`const { data } = …` → `role = "client"`). O sea: te deja
entrar a `/inicio` y ahí revienta el render. Coincide exactamente con el síntoma.

Tres causas posibles, todas sobre esa misma línea. Chequealas en este orden
(de más barata a más cara):

**a) `@/lib/env` tira al validar con Zod.** `src/lib/supabase/server.ts` lee
`process.env` directo, pero `@/lib/db` importa `@/lib/env`, que hace
`throw` si falta o es inválida una requerida. Ojo con dos trampas:

- `NEXT_PUBLIC_APP_URL` es `z.string().url()` → si en Vercel está como
  `al-toque-eta.vercel.app` **sin `https://`**, Zod falla y tira. Tiene que ser
  `https://al-toque-eta.vercel.app`.
- `COMMISSION_RATE` pasa por `Number(v)` → cualquier cosa no numérica da `NaN`
  y tira. Si no la vas a usar, mejor no definirla (default `0.12`).

Requeridas: `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Verificá que
estén marcadas para el entorno **Production** (no solo Preview/Development).

**b) `DATABASE_URL` apunta a un host inalcanzable desde Vercel.** El host
directo `db.<ref>.supabase.co` es **IPv6-only** → desde Vercel da
`ENETUNREACH`/`ENOTFOUND`. Usá el pooler: `aws-0-<region>.pooler.supabase.com:6543`
con usuario `postgres.<project-ref>`. (Y confirmá que no quedó pegado el
`localhost:5432` del `.env.local`.)

**c) El schema nunca se aplicó a la base de prod** → `relation "profiles" does
not exist`. Es coherente con que `.env.local` apunte a `localhost`: puede que
ese proyecto de Supabase tenga `auth.users` (por eso el registro anda) pero el
schema `public` vacío. Chequeo de 5 segundos en el SQL Editor:

```sql
select to_regclass('public.profiles')      as profiles,
       to_regclass('public.notifications') as notifications,
       to_regclass('public.audit_logs')    as audit_logs;
```

`null` en `profiles` → es (c): seguí el runbook completo desde el paso 1.
`profiles` con valor pero `audit_logs` en `null` → el schema está pero falta la
migración `0001`; igual seguí el runbook (y (a)/(b) siguen en pie para este
crash puntual).

**Para el stack real:** Vercel → proyecto → **Logs** (Runtime), reproducí
entrando a `/inicio` y buscá el evento con `digest: 1603926555`. El digest es
solo un hash — el mensaje verdadero está ahí y desambigua (a)/(b)/(c) de una.

> Aunque el crash resulte ser (a) o (b), las migraciones siguen pendientes:
> apenas arranque `/inicio`, `/perfil` va a fallar por `audit_logs` y la
> campanita por `notifications.link`.

---

## 0. Lo que estaba roto (ya corregido en el repo)

| # | Problema | Fix |
|---|----------|-----|
| 1 | `drizzle-kit` **solo autocarga `.env`**, nunca `.env.local`. Como `drizzle.config.ts` leía `process.env.DATABASE_URL` sin cargar nada, `pnpm db:migrate` fallaba con `Please provide required params for Postgres driver: [x] url: undefined`. | `drizzle.config.ts` ahora carga `.env.migrate` → `.env.local` → `.env` con `dotenv` (agregado a devDependencies). |
| 2 | No había forma de apuntar las migraciones a una URL distinta de la de runtime. | `drizzle.config.ts` acepta `MIGRATION_DATABASE_URL` con fallback a `DATABASE_URL`. |
| 3 | El final de `drizzle/postgis.sql` (`alter publication supabase_realtime add table …`) **no era idempotente**: al re-correrlo tiraba `duplicate_object` y el SQL Editor de Supabase hacía rollback de *todo* el script — incluido el índice único de pagos. | Los tres `add table` van ahora en bloques `do $$ … exception when duplicate_object then null; end $$;`. |
| 4 | `.env.local` apunta a `@localhost:5432` — o sea, nunca se migró contra Supabase desde esta máquina. | Ver paso 1: hay que traerse la connection string real. |

Después de tirar los cambios:

```powershell
pnpm install     # instala dotenv
```

---

## 1. Conseguir las dos connection strings

Supabase → **Project Settings → Database → Connection string**. Son distintas y
cumplen roles distintos:

| Uso | Modo | Puerto | Va en |
|-----|------|--------|-------|
| **Runtime de la app** (Vercel) | Transaction pooler | `6543` | env var `DATABASE_URL` en Vercel |
| **Migraciones** (drizzle-kit) | Session pooler o conexión directa | `5432` | solo tu shell / `.env.migrate`, nunca en Vercel |

Por qué la distinción:

- El runtime serverless abre y cierra conexiones todo el tiempo → necesita el
  pooler de transacción. `src/lib/db/index.ts` ya pasa `{ prepare: false }`,
  que es exactamente lo que pgBouncer en modo transacción exige. ✅
- `drizzle-kit migrate` corre el DDL **dentro de una transacción con sentencias
  preparadas**. Contra el puerto `6543` eso falla o se aplica a medias. Siempre
  migrar por `5432`.

> La conexión directa (`db.<ref>.supabase.co:5432`) hoy es **IPv6-only** en
> proyectos nuevos. Si tu red no tiene IPv6, usá el **session pooler**
> (`aws-0-<region>.pooler.supabase.com:5432`, usuario `postgres.<project-ref>`).

---

## 2. Correr la migración

**Recomendado — variable solo para ese comando (PowerShell):**

```powershell
$env:MIGRATION_DATABASE_URL = "postgresql://postgres.<ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres"
pnpm db:migrate
Remove-Item Env:\MIGRATION_DATABASE_URL   # importante: no dejarla colgada en la sesión
```

Alternativa: crear un `.env.migrate` (ya está en `.gitignore`) con
`MIGRATION_DATABASE_URL=...`. Más cómodo, pero **si te lo olvidás ahí, el
próximo `pnpm db:migrate` pega contra producción**. Elegí a conciencia.

Si la password tiene caracteres especiales (`@`, `#`, `/`, `:`), URL-encodealos
o la connection string se parte mal.

Salida esperada: aplica `0001_bouncy_martin_li` y deja el registro en la tabla
`drizzle.__drizzle_migrations`. `0000` ya debería figurar como aplicada — si
drizzle intenta re-aplicar `0000`, **frená**: significa que estás apuntando a
una base equivocada (probablemente la local).

---

## 3. SQL manual, en este orden

Supabase → **SQL Editor**. Los tres scripts son idempotentes (con el fix #3).

1. `docs/audit-notifications-setup.sql`
   - Sección 1 (DDL) se puede saltear si ya corriste `db:migrate` — es
     `if not exists`, así que tampoco molesta.
   - **Secciones 2 y 3 son obligatorias siempre**: RLS `audit_self_read` sobre
     `audit_logs` y publicación Realtime de `notifications` (sin esto la
     campanita no recibe eventos en vivo).
2. `drizzle/postgis.sql` — re-run necesario por el índice único
   `uq_jobs_mp_payment_id` (idempotencia del webhook de Mercado Pago, Step 9a).
   Ahora se puede re-correr entero sin romper.
3. `docs/supabase-storage-setup.sql` — solo si el bucket `avatars` todavía no
   existe en prod.

Verificación (pegar en el SQL Editor):

```sql
select action, count(*) from audit_logs group by 1;               -- tabla existe
select policyname from pg_policies where tablename = 'audit_logs';-- audit_self_read
select tablename from pg_publication_tables
  where pubname = 'supabase_realtime';                            -- notifications, jobs, job_dispatch, messages
select indexname from pg_indexes where indexname = 'uq_jobs_mp_payment_id';
select column_name from information_schema.columns
  where table_name = 'notifications' and column_name = 'link';
```

---

## 4. Recién ahí, deployar

Las migraciones van **antes** del deploy: el código nuevo (`lib/audit.ts`,
`NotificationsBell`) asume que `audit_logs` y `notifications.link` existen.
Al revés, prod tira errores de columna inexistente hasta que migres.

Env vars a confirmar en Vercel (Production) — hoy `.env.local` solo tiene 6 de
estas, así que revisá el dashboard, no el archivo:

- `DATABASE_URL` (pooler `6543`), `NEXT_PUBLIC_APP_URL` (dominio real, no localhost)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET` — **sin esto los dos crons de `vercel.json` quedan sin protección**
- Opcionales que degradan en silencio si faltan: `RESEND_API_KEY` + `EMAIL_FROM`
  (emails no-op), `VAPID_*` (push off), `MP_*` (pagos), `*_GOOGLE_MAPS_*` (mapa fallback)

`src/lib/env.ts` valida con Zod al iniciar: si falta una **requerida**, el build
de Vercel se cae con "Variables de entorno inválidas".

---

## 5. Reglas permanentes

- **Nunca `pnpm db:push` contra prod.** `push` compara el schema de Drizzle
  contra la base y borra lo que no conoce: los objetos PostGIS, las policies
  RLS, las funciones `find_nearby_providers` y el índice único de pagos viven
  fuera de `schema.ts`. `migrate` (basado en el journal) es el único camino
  seguro.
- Nada de migraciones en el build de Vercel. Con `vercel.json` disparando dos
  crons y varios builds concurrentes (previews), un `migrate` en el build es
  una condición de carrera. Manual y deliberado.
- Todo objeto que no esté en `schema.ts` va en un `.sql` idempotente dentro de
  `drizzle/` o `docs/`, y se anota en `CLAUDE.md` como paso manual.
- Snapshot de la base antes de migrar (Supabase → Database → Backups). El plan
  free no tiene PITR.
