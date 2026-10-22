import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions, providerProfiles } from "@/lib/db/schema";
import { FREE_JOBS } from "@/lib/subscriptions/plans";

/**
 * ¿El cliente tiene una suscripción Premium (`client_monthly`) habilitada?
 * Gate de las funciones exclusivas de Premium (hoy: pedidos urgentes).
 * `active` y `past_due` habilitan (durante la gracia el acceso sigue abierto,
 * spec §6); `pending` aún no autorizó el pago en MP.
 */
export async function hasActiveClientSubscription(
  profileId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.profileId, profileId),
        eq(subscriptions.plan, "client_monthly"),
        inArray(subscriptions.status, ["active", "past_due"]),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/**
 * ¿El profesional puede recibir y aceptar pedidos nuevos? Está habilitado si:
 *  - tiene suscripción activa (`subscription_active`, incluye la gracia
 *    `past_due`, lo mantiene el webhook de MP), O
 *  - todavía está en el trial de bienvenida (`jobs_completed < FREE_JOBS`).
 * Es la MISMA regla que el gate PostGIS del matching
 * (`find_nearby_providers` / `find_nearby_online_providers`).
 */
export async function providerCanReceiveJobs(
  profileId: string,
): Promise<boolean> {
  const [row] = await db
    .select({
      active: providerProfiles.subscriptionActive,
      jobsCompleted: providerProfiles.jobsCompleted,
    })
    .from(providerProfiles)
    .where(eq(providerProfiles.profileId, profileId))
    .limit(1);
  if (!row) return false;
  return row.active || row.jobsCompleted < FREE_JOBS;
}
