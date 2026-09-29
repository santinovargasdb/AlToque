import "server-only";

import { headers } from "next/headers";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

/**
 * Rate limiting con Upstash Redis — PRE-CABLEADO.
 *
 * Si NO están seteadas `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`,
 * `allow()` devuelve siempre `true` (no-op): el código funciona igual sin Redis.
 * Apenas cargás esas dos env vars (Upstash gratis → Vercel), empieza a limitar
 * sin tocar más código. Guía completa: `docs/security-rate-limiting.md`.
 */
const url = env.UPSTASH_REDIS_REST_URL;
const token = env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

/**
 * Login: 10 intentos cada 15 min por (ip+email). Más tolerante: un usuario
 * legítimo puede tipear mal la contraseña varias veces (sobre todo en mobile)
 * sin quedar bloqueado, y 10/15min igual frena la fuerza bruta en seco.
 */
export const loginLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "15 m"),
      prefix: "rl:login",
      analytics: false,
    })
  : null;

/**
 * Registro y reset de contraseña: 5 cada 15 min por (ip+email). Más ajustado:
 * no hay razón legítima para repetirlos tanto, y evita spam de emails.
 */
export const sensitiveLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      prefix: "rl:sensitive",
      analytics: false,
    })
  : null;

/** IP del cliente detrás del proxy de Vercel (primer valor de x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
}

/**
 * `true` si la acción puede seguir; `false` si la clave excedió el límite.
 *
 * - No-op (siempre `true`) cuando Upstash no está configurado.
 * - Fail-open ante error de red: si Redis se cae, NO bloqueamos a usuarios
 *   legítimos (el objetivo es frenar fuerza bruta, no romper el login).
 */
export async function allow(
  limiter: Ratelimit | null,
  key: string,
): Promise<boolean> {
  if (!limiter) return true;
  try {
    const { success } = await limiter.limit(key);
    return success;
  } catch {
    return true;
  }
}
