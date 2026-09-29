# Rate limiting — PENDIENTE de implementar

**Estado:** ❌ No implementado. Hoy la única barrera contra fuerza bruta es el
rate limit propio de **Supabase Auth** (del lado de Supabase, fuera del control
de la app). Los endpoints propios y las Server Actions de auth no tienen límite.

Requiere infraestructura (una instancia de Redis) que hay que crear una vez.

## Qué proteger (prioridad)

| Dónde | Archivo | Clave sugerida | Límite sugerido |
|---|---|---|---|
| Login con contraseña | `src/lib/actions/auth.ts` → `signInWithPassword` | `ip + email` | 5 / 15 min |
| Reset de contraseña | `src/lib/actions/auth.ts` → `requestPasswordReset` | `ip + email` | 3 / 15 min |
| Reenvío de OTP / signup | `signUpWithPassword`, envío de OTP | `ip + email` | 5 / 15 min |
| `POST /api/push/subscribe` | `src/app/api/push/subscribe/route.ts` | `userId` | 30 / min |

El webhook de Mercado Pago y los crons **no** necesitan rate limit propio
(ya están protegidos por firma HMAC y `CRON_SECRET`).

## Opción A — Upstash Redis + `@upstash/ratelimit` (recomendada)

1. Crear una base gratis en https://upstash.com (Redis) y copiar
   `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`.
2. Agregarlas a Vercel (Production/Preview) y a `.env.local` + validarlas en
   `src/lib/env.ts` (como el resto).
3. `pnpm add @upstash/ratelimit @upstash/redis`
4. Crear `src/lib/ratelimit.ts`:

   ```ts
   import "server-only";
   import { Ratelimit } from "@upstash/ratelimit";
   import { Redis } from "@upstash/redis";
   import { env } from "@/lib/env";

   const redis = env.UPSTASH_REDIS_REST_URL
     ? new Redis({
         url: env.UPSTASH_REDIS_REST_URL,
         token: env.UPSTASH_REDIS_REST_TOKEN!,
       })
     : null;

   /** 5 intentos cada 15 min por clave (ip+email). No-op si no hay Redis. */
   export const authLimiter = redis
     ? new Ratelimit({
         redis,
         limiter: Ratelimit.slidingWindow(5, "15 m"),
         prefix: "rl:auth",
       })
     : null;

   /** Devuelve true si SÍ puede seguir; false si excedió el límite. */
   export async function allow(limiter: Ratelimit | null, key: string) {
     if (!limiter) return true; // sin Redis configurado, no bloquea
     const { success } = await limiter.limit(key);
     return success;
   }
   ```

5. Usarlo al principio de cada acción sensible (ejemplo login):

   ```ts
   import { headers } from "next/headers";
   import { allow, authLimiter } from "@/lib/ratelimit";

   const ip =
     (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
   if (!(await allow(authLimiter, `${ip}:${email}`))) {
     return { ok: false, error: "Demasiados intentos. Probá de nuevo en unos minutos." };
   }
   ```

Con `allow()` devolviendo `true` cuando no hay Redis, el código se puede mergear
YA sin romper nada; queda activo apenas se setean las env vars.

## Opción B — Vercel Firewall / Rate Limiting (sin código)

Vercel ofrece rate limiting a nivel edge por ruta (Pro). Se configura desde el
dashboard sin tocar código. Sirve para `/ingresar`, `/registro`, `/restablecer`
y `/api/*`. Menos granular que la Opción A (no puede keyear por email), pero
cero mantenimiento. Se pueden combinar las dos.
