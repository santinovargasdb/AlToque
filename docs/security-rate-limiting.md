# Rate limiting — sobre Postgres (Supabase), sin servicios externos

**Estado:** ✅ Código listo. Se **activa** apenas creás la tabla `rate_limits`
en Supabase (una vez). No usa Redis ni ninguna cuenta extra: cuenta los intentos
en tu propia base Postgres.

- `src/lib/ratelimit.ts` — `allow(cfg, key)` hace un upsert atómico (ventana
  fija) sobre `rate_limits` vía Drizzle. `loginLimiter` (10/15 min) y
  `sensitiveLimiter` (5/15 min), por `ip + email`.
- Enganchado en `signInWithPassword`, `signUpWithPassword` y
  `requestPasswordReset` (`src/lib/actions/auth.ts`).
- **Fail-open:** si la tabla no existe todavía o la query falla, deja pasar (no
  rompe el login). Por eso, hasta que corras el SQL, es un no-op.

Límites por `ip + email` (buckets separados): **login 10 / 15 min**,
**registro y reset 5 / 15 min**. Login más tolerante (para no bloquear a un
usuario que tipea mal la contraseña); registro/reset más ajustados.

## Para activarlo (1 paso, ~1 minuto)

Correr **`drizzle/rate-limits.sql`** en el **SQL Editor de Supabase** (crea la
tabla `rate_limits` + índice + RLS). Eso es todo — no hay env vars ni redeploy
necesario (el código ya está en prod y empieza a contar apenas la tabla existe).

## Cómo verificar que quedó activo

En `/ingresar`, meté mal la contraseña **11 veces seguidas** con el mismo email:
a partir del 11º intento tenés que ver **"Demasiados intentos. Esperá unos
minutos y volvé a probar."** (antes, "Email o contraseña incorrectos"). En
Supabase → Table Editor → `rate_limits` vas a ver las filas `login:<ip>:<email>`
con su `count`.

## Ajustar los límites

En `src/lib/ratelimit.ts`, `loginLimiter` = `{ limit: 10, windowMinutes: 15 }` y
`sensitiveLimiter` = `{ limit: 5, windowMinutes: 15 }`. Cambiá esos números para
endurecer o aflojar. Para limitar otro endpoint (ej. `POST /api/push/subscribe`),
importá `allow` + una config y llamalo al inicio con una clave (`userId`, `ip`…).

## Higiene (opcional)

La tabla crece con la cantidad de claves distintas (acción+ip+email). A escala
chica es trivial. Para limpiarla, podés programar en Supabase (pg_cron) o correr
a mano cada tanto:

```sql
delete from rate_limits where expires_at < now();
```

## Alternativa sin código: Vercel Firewall

Vercel (Pro) permite rate limiting a nivel edge por ruta desde el dashboard, sin
código. Menos granular (no puede keyear por email), pero cero mantenimiento.
