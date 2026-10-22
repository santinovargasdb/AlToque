import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions, providerProfiles } from "@/lib/db/schema";

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
 * ¿El profesional puede recibir y aceptar pedidos nuevos?
 * Lee el flag derivado `subscription_active` de `provider_profiles`, que
 * mantiene el webhook de MP. Es la MISMA fuente de verdad que el gate PostGIS
 * del matching (`find_nearby_providers` / `find_nearby_online_providers`), e
 * incluirá el período de gracia (`past_due`) cuando se implemente.
 */
export async function hasActiveProviderSubscription(
  profileId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ active: providerProfiles.subscriptionActive })
    .from(providerProfiles)
    .where(eq(providerProfiles.profileId, profileId))
    .limit(1);
  return Boolean(row?.active);
}
