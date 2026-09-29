# Rate limiting — PRE-CABLEADO (falta solo la instancia de Upstash)

**Estado:** ✅ Código listo, 🔌 **desconectado hasta cargar 2 env vars.**

El rate limiting ya está integrado en el código (`src/lib/ratelimit.ts` +
enganchado en `signInWithPassword`, `signUpWithPassword` y
`requestPasswordReset` de `src/lib/actions/auth.ts`). Mientras NO estén seteadas
las env de Upstash, `allow()` es **no-op** (deja pasar todo) → la app funciona
igual. Apenas cargás las 2 variables, se activa el límite **sin tocar más código
ni redeployar código** (solo un redeploy para tomar las env vars).

Límite actual: **5 intentos cada 15 minutos** por `ip + email`, con buckets
separados para login / registro / reset (prefijos `login:` / `signup:` /
`reset:`). Fail-open: si Redis se cae, no bloquea a usuarios legítimos.

## Para activarlo (5 minutos, una vez)

1. Crear una base gratis en https://upstash.com → **Redis** (región cercana, ej.
   `us-east-1`).
2. En la página de la base, copiar **REST URL** y **REST TOKEN**.
3. Cargarlas en **Vercel → Settings → Environment Variables** (Production +
   Preview) y, para probar local, en `.env.local`:

   ```
   UPSTASH_REDIS_REST_URL="https://xxxx.upstash.io"
   UPSTASH_REDIS_REST_TOKEN="xxxx"
   ```

4. **Redeploy** (Vercel → Deployments → Redeploy, o un push cualquiera). Listo:
   los intentos de login/registro/reset quedan limitados.

Ya están declaradas en `src/lib/env.ts` (opcionales, validadas con Zod) y en
`.env.example`.

## Cómo verificar que quedó activo

Después de setear las env vars y redeployar, en `/ingresar` meté mal la
contraseña 6 veces seguidas con el mismo email: a partir del 6º intento tenés
que ver **"Demasiados intentos. Esperá unos minutos y volvé a probar."** (antes
de eso, "Email o contraseña incorrectos"). En el dashboard de Upstash vas a ver
las keys `rl:auth:login:...` con su contador.

## Ajustar el límite

En `src/lib/ratelimit.ts`, `authLimiter` usa
`Ratelimit.slidingWindow(5, "15 m")`. Cambiá esos números para endurecer o
aflojar. Para agregar el límite a otro endpoint (ej. `POST /api/push/subscribe`),
importá `allow` + un limiter nuevo y llamalo al inicio del handler con una clave
(`userId`, `ip`, etc.).

## Alternativa sin código: Vercel Firewall

Vercel (Pro) permite rate limiting a nivel edge por ruta desde el dashboard, sin
código, para `/ingresar`, `/registro`, `/restablecer`, `/api/*`. Menos granular
(no puede keyear por email), pero cero mantenimiento. Se puede combinar con lo
de arriba.
