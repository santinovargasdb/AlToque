import { z } from "zod";

/**
 * Suscripción Web Push tal como la entrega `PushSubscription.toJSON()` del
 * browser. `expirationTime` y otras claves extra se descartan (zod strip).
 */
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

/** Body de la baja de suscripción (DELETE). */
export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url(),
});
