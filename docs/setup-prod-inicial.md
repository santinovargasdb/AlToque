# Setup inicial de la base de producción — hacelo en este orden

**Diagnóstico (2026-07-29):** `select to_regclass('public.profiles')` devolvió
`null` en el proyecto de Supabase de producción. La base tiene `auth.users`
(por eso registro y login funcionan) pero el schema `public` está vacío. Por eso
`/inicio` tira `Application error` — es la primera pantalla que lee `profiles`
con Drizzle.

**El orden importa.** Saltear un paso hace fallar el siguiente. Marcá cada uno.

---

### ☐ Paso 0 — Instalar la dependencia nueva

En la carpeta `AlToque-1`, en la terminal:

```powershell
pnpm install
```

(Agregué `dotenv` a devDependencies; sin esto `pnpm db:migrate` no encuentra la
connection string.)

---

### ☐ Paso 1 — Habilitar PostGIS **antes** de migrar

Supabase → SQL Editor → pegá `drizzle/00-pre-migrate.sql` → Run.

> Esto no estaba documentado y te iba a frenar: la migración `0000` crea columnas
> `geography(Point, 4326)`, pero PostGIS recién se habilita en `postgis.sql`, que
> según los comentarios va *después* de migrar. En una base nueva eso es un
> huevo-y-gallina: `db:migrate` falla con `type "geography" does not exist`.
> Por eso ahora hay un script de pre-migración.

Tiene que devolver una fila con `postgis` y su versión.

---

### ☐ Paso 2 — Copiar la connection string de migración

Supabase → **Project Settings → Database → Connection string → Session pooler**.
Es la del puerto **5432** (la de `6543` es para la app, no sirve para migrar).

Se ve así: `postgresql://postgres.<ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres`

---

### ☐ Paso 3 — Correr la migración

En PowerShell, en `AlToque-1` (reemplazá la URL por la del paso 2):

```powershell
$env:MIGRATION_DATABASE_URL = "postgresql://postgres.<ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres"
pnpm db:migrate
Remove-Item Env:\MIGRATION_DATABASE_URL
```

Tiene que aplicar `0000_careful_cannonball` y `0001_bouncy_martin_li`.
Si la contraseña tiene `@ # / :`, URL-encodealos o la string se parte mal.

---

### ☐ Paso 4 — Los SQL manuales, en este orden

Supabase → SQL Editor. Uno por uno, todos son idempotentes:

1. `drizzle/auth-triggers.sql` — crea la fila `profiles` al registrarse + el claim `user_role` del JWT
2. `drizzle/backfill-profiles.sql` — **tu cuenta actual no tiene perfil** (se registró cuando la tabla no existía); esto lo crea
3. `drizzle/postgis.sql` — índices GIST, `find_nearby_providers`, RLS de todas las tablas, Realtime
4. `drizzle/seed-categories.sql` — los oficios
5. `drizzle/storage.sql` + `docs/supabase-storage-setup.sql` — buckets (verificaciones, fotos, avatares)
6. `docs/audit-notifications-setup.sql` — RLS de `audit_logs` + Realtime de `notifications`

---

### ☐ Paso 5 — Activar el hook del JWT

Supabase → **Authentication → Hooks → Custom Access Token** → elegir
`public.custom_access_token_hook` (la creó el paso 4.1).

Sin esto el middleware no ve `user_role` en el token y cae al fallback por
consulta — anda, pero más lento y frágil.

---

### ☐ Paso 6 — Verificar el `DATABASE_URL` de Vercel

Está marcado como sensible, así que no se puede leer: **borralo y volvé a
crearlo** con la connection string del **Transaction pooler (puerto 6543)** —
no la del 5432 del paso 2, y no la directa `db.<ref>.supabase.co` (es IPv6-only
y Vercel no llega).

Confirmá también que apunta al mismo proyecto de Supabase donde acabás de correr
todo esto.

---

### ☐ Paso 7 — Redeploy y probar

Vercel → Deployments → Redeploy (hace falta para tomar cambios de env vars).
Después entrá a `/inicio`.

Chequeo final en el SQL Editor — los tres tienen que dar valor, no `null`:

```sql
select to_regclass('public.profiles')      as profiles,
       to_regclass('public.notifications') as notifications,
       to_regclass('public.audit_logs')    as audit_logs;
```

---

Si algo falla en el camino, pasame el mensaje de error tal cual y seguimos desde
ahí. El runbook para las **próximas** migraciones (cuando la base ya exista) está
en `docs/deploy-migraciones.md`.
