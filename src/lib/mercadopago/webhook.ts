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
    // El SDK valida el HMAC; la ventana de tiempo (anti-replay) se chequea
    // aparte porque el SDK asume `ts` en milisegundos y MP puede mandarlo en
    // segundos (con el SDK eso da una deriva de décadas y rechaza todo).
    WebhookSignatureValidator.validate({
      xSignature: input.xSignature,
      xRequestId: input.xRequestId,
      dataId: input.dataId,
      secret,
    });
    const driftSeconds = signatureDriftSeconds(input.xSignature, Date.now());
    if (driftSeconds === null || driftSeconds > TOLERANCE_SECONDS) {
      console.warn("[mp-webhook] ts fuera de ventana, deriva (s):", driftSeconds);
      return false;
    }
    return true;
  } catch (e) {
    if (e instanceof InvalidWebhookSignatureError) {
      // Solo el motivo (SignatureMismatch, TimestampOutOfTolerance, …), sin valores.
      console.warn("[mp-webhook] motivo del rechazo:", e.reason);
      return false;
    }
    throw e;
  }
}

/**
 * Deriva en segundos entre el `ts` de `x-signature` y `nowMs`. Acepta `ts` en
 * segundos o milisegundos (un epoch en ms tiene 13 dígitos; en s, 10).
 * Devuelve null si el header no trae un `ts` numérico.
 */
export function signatureDriftSeconds(
  xSignature: string | null,
  nowMs: number,
): number | null {
  const match = xSignature?.match(/(?:^|,)\s*ts=(\d+)/);
  if (!match) return null;
  const ts = Number(match[1]);
  const tsMs = ts < 1e12 ? ts * 1000 : ts;
  return Math.round(Math.abs(nowMs - tsMs) / 1000);
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
