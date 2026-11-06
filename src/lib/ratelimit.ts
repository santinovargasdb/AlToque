import "server-only";

import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Rate limiting sobre la MISMA base Postgres de Supabase — sin Redis ni cuentas
 * extra.
 *
 * Cuenta los intentos en la tabla `rate_limits` con una ventana fija atómica
 * (un `insert ... on conflict do update` que incrementa o resetea según la
 * ventana). Corré `drizzle/rate-limits.sql` una vez en Supabase para crear la
 * tabla. Hasta que exista, `allow()` es no-op (fail-open): si la query falla por
 * lo que sea, deja pasar — el objetivo es frenar fuerza bruta, nunca romper el
 * login. Ver `docs/security-rate-limiting.md`.
 */
export type RateConfig = { limit: number; windowMinutes: number };

/** Login: 10 intentos / 15 min por (ip+email). Tolerante con tipeos. */
export const loginLimiter: RateConfig = { limit: 10, windowMinutes: 15 };

/** Registro y reset de contraseña: 5 / 15 min por (ip+email). Más ajustado. */
export const sensitiveLimiter: RateConfig = { limit: 5, windowMinutes: 15 };

/**
 * Cuánto más tolerantes son los contadores por email y por IP que el de la
 * combinación. El de email no puede ser muy bajo: cualquiera podría trabar el
 * login de otra persona a propósito. El de IP tiene margen para redes compartidas.
 */
const EMAIL_LIMIT_FACTOR = 2;
const IP_LIMIT_FACTOR = 5;

/** IP del cliente detrás del proxy de Vercel (primer valor de x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
}

/**
 * `true` si la clave puede seguir; `false` si superó el límite en la ventana.
 * Fail-open ante error o si la tabla `rate_limits` todavía no existe.
 */
export async function allow(cfg: RateConfig, key: string): Promise<boolean> {
  try {
    const rows = (await db.execute(sql`
      insert into rate_limits (id, count, expires_at)
      values (${key}, 1, now() + (${cfg.windowMinutes}::int * interval '1 minute'))
      on conflict (id) do update set
        count = case when rate_limits.expires_at < now()
                     then 1 else rate_limits.count + 1 end,
        expires_at = case when rate_limits.expires_at < now()
                          then now() + (${cfg.windowMinutes}::int * interval '1 minute')
                          else rate_limits.expires_at end
      returning count
    `)) as unknown as Array<{ count: number }>;
    const count = Number(rows[0]?.count ?? 0);
    return count <= cfg.limit;
  } catch {
    return true; // fail-open (tabla inexistente o error de DB)
  }
}

/**
 * Controla un intento de auth con tres contadores: IP+email frena los reintentos
 * comunes, email frena a quien rota de IP e IP frena a quien prueba muchos emails.
 * Todos cuentan siempre, aunque otro ya haya cortado.
 */
export async function allowAttempt(
  action: string,
  cfg: RateConfig,
  ip: string,
  email: string,
): Promise<boolean> {
  const normalizedEmail = email.toLowerCase();
  const results = await Promise.all([
    allow(cfg, `${action}:${ip}:${normalizedEmail}`),
    allow(
      { ...cfg, limit: cfg.limit * EMAIL_LIMIT_FACTOR },
      `${action}:email:${normalizedEmail}`,
    ),
    allow({ ...cfg, limit: cfg.limit * IP_LIMIT_FACTOR }, `${action}:ip:${ip}`),
  ]);
  return results.every(Boolean);
}

/** Borra los contadores vencidos. Devuelve cuántos borró; 0 si la query falla. */
export async function purgeExpiredRateLimits(): Promise<number> {
  try {
    const rows = (await db.execute(
      sql`delete from rate_limits where expires_at < now() returning id`,
    )) as unknown as Array<{ id: string }>;
    return rows.length;
  } catch {
    return 0; // la limpieza nunca hace fallar el cron que la llama
  }
}
