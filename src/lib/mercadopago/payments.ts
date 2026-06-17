import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";

/**
 * Marca el pago de un job como retenido. Idempotente: el `isNull(mp_payment_id)`
 * garantiza que sólo la primera entrega del webhook transiciona (las repetidas
 * encuentran mp_payment_id ya seteado y no hacen nada).
 * @returns true si transicionó, false si ya estaba marcado.
 */
export async function markPaymentHeld(
  jobId: string,
  mpPaymentId: string,
): Promise<boolean> {
  const rows = await db
    .update(jobs)
    .set({ paymentStatus: "held", mpPaymentId, updatedAt: new Date() })
    .where(and(eq(jobs.id, jobId), isNull(jobs.mpPaymentId)))
    .returning({ id: jobs.id });
  return rows.length > 0;
}
