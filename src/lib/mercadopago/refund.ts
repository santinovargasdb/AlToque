import "server-only";
import { PaymentRefund } from "mercadopago";
import { mpConfig } from "./client";

/** Reintegro TOTAL de un pago de MP (devuelve el monto retenido al cliente). */
export async function refundJobPayment(mpPaymentId: string): Promise<void> {
  const refunds = new PaymentRefund(mpConfig());
  await refunds.total({ payment_id: mpPaymentId });
}
