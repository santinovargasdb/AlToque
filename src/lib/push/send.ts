import "server-only";
import webpush from "web-push";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";

/**
 * Envío de Web Push (VAPID). Única puerta de salida del push del lado del
 * servidor: `dispatch.ts` (nuevo pedido urgente) y `acceptJob` (pedido
 * aceptado) la usan.
 *
 * Diseño defensivo: si faltan las claves VAPID es no-op (dev sin keys), y un
 * error de envío NUNCA hace fallar el flujo que la invoca (allSettled + log).
 * Las suscripciones muertas (404/410) se borran.
 */

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:soporte@altoque.app",
    publicKey,
    privateKey,
  );
  configured = true;
  return true;
}

export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  if (userIds.length === 0) return;
  if (!ensureConfigured()) {
    console.warn("[push] VAPID keys ausentes; se omite el envío.");
    return;
  }

  const subs = await db
    .select({
      id: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.userId, userIds));
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);
  const dead: string[] = [];

  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          dead.push(s.id); // suscripción expirada/cancelada
        } else {
          console.error("[push] error al enviar:", code ?? err);
        }
      }
    }),
  );

  if (dead.length > 0) {
    await db
      .delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.id, dead));
  }
}
