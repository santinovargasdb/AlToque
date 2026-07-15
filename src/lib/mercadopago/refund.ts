import "server-only";
import { PaymentRefund } from "mercadopago";
import { mpConfig } from "./client";

/** Reintegro TOTAL de un pago de MP (devuelve el monto retenido al cliente). */
export async function refundJobPayment(mpPaymentId: string): Promise<void> {
  const refunds = new PaymentRefund(mpConfig());
  await refunds.total({ payment_id: mpPaymentId });
}

/**
 * Reintegro PARCIAL: devuelve al cliente la diferencia cuando el precio final
 * quedó por debajo del estimado prepagado (liquidación del Step 9b).
 */
export async function refundJobPaymentPartial(
  mpPaymentId: string,
  amount: number,
): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Monto de reintegro parcial inválido: ${amount}`);
  }
  const refunds = new PaymentRefund(mpConfig());
  await refunds.create({ payment_id: mpPaymentId, body: { amount } });
}
