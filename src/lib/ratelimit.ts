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
