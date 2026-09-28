import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";

/**
 * ¿El cliente tiene una suscripción Premium (`client_monthly`) activa?
 * Gate de las funciones exclusivas de Premium (hoy: pedidos urgentes).
 * Solo `active` habilita el beneficio; `pending` aún no autorizó el pago en MP.
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
        eq(subscriptions.status, "active"),
      ),
    )
    .limit(1);
  return Boolean(row);
}
