import "server-only";
import {
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
  Payment,
} from "mercadopago";
import { mpConfig } from "./client";

const TOLERANCE_SECONDS = 300;

export type WebhookSignatureInput = {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
};

/**
 * Verifica la firma HMAC del webhook de MP usando el validador oficial del SDK.
 * Devuelve false si falta el secreto o la firma es inválida (no lanza).
 */
export function isValidWebhookSignature(input: WebhookSignatureInput): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return false;
  try {
    WebhookSignatureValidator.validate({
      xSignature: input.xSignature,
      xRequestId: input.xRequestId,
      dataId: input.dataId,
      secret,
      toleranceSeconds: TOLERANCE_SECONDS,
    });
    return true;
  } catch (e) {
    if (e instanceof InvalidWebhookSignatureError) return false;
    throw e;
  }
}

export type PaymentInfo = {
  paymentId: string;
  status: string;
  jobId: string | null;
};

/** Consulta el pago en MP y extrae status + jobId (external_reference). */
export async function fetchPaymentInfo(paymentId: string): Promise<PaymentInfo> {
  const payment = new Payment(mpConfig());
  const res = await payment.get({ id: paymentId });
  return {
    paymentId,
    status: res.status ?? "unknown",
    jobId: res.external_reference ?? null,
  };
}
