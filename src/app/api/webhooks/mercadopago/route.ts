import { NextResponse, type NextRequest } from "next/server";
import { isValidWebhookSignature } from "@/lib/mercadopago/webhook";
import {
  fetchPreApprovalStatus,
  fetchAuthorizedPaymentStatus,
} from "@/lib/mercadopago/subscriptions";
import {
  processPreapprovalEvent,
  processAuthorizedPaymentApproved,
} from "@/lib/actions/subscription";
import { isKnownPreapproval } from "@/lib/subscriptions/status";

type WebhookBody = {
  type?: string;
  topic?: string;
  data?: { id?: string | number };
};

/**
 * Webhook de Mercado Pago.
 * Verificación: HMAC-SHA256 sobre el manifest `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 * usando la cabecera `x-signature` y el secreto `MP_WEBHOOK_SECRET`.
 * Ver implementación en lib/mercadopago/webhook.ts → WebhookSignatureValidator (SDK oficial).
 *
 * @pagokit:signature-verified — verificación delegada a isValidWebhookSignature (lib/mercadopago/webhook.ts)
 */
// @pagokit:signature-verified
// pagokit-ignore: webhook-has-signature -- la firma se verifica abajo con isValidWebhookSignature (HMAC-SHA256, lib/mercadopago/webhook.ts); el detector no reconoce el wrapper custom
export async function POST(request: NextRequest) {
  // Leer body como texto crudo; JSON.parse DESPUÉS de verificar la firma
  const rawBody = await request.text();
  const url = new URL(request.url);
  const queryDataId = url.searchParams.get("data.id");

  let body: WebhookBody | null = null;
  try {
    body = JSON.parse(rawBody) as WebhookBody;
  } catch {
    // body permanece null — dataId se tomará de la query si existe
  }

  const dataId =
    queryDataId ??
    (body?.data?.id != null ? String(body.data.id) : null);

  if (
    !isValidWebhookSignature({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
    })
  ) {
    // Diagnóstico sin datos sensibles: solo qué piezas llegaron (sí/no).
    console.warn("[mp-webhook] firma rechazada", {
      hasSecret: Boolean(process.env.MP_WEBHOOK_SECRET),
      hasSignature: Boolean(request.headers.get("x-signature")),
      hasRequestId: Boolean(request.headers.get("x-request-id")),
      dataIdFrom: queryDataId ? "query" : dataId ? "body" : "none",
    });
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const topic = body?.type ?? body?.topic ?? "";

  // Se procesa ANTES de responder: en Vercel el trabajo que queda colgando
  // después de la respuesta puede cortarse, y el pago quedaría sin registrar.
  // Si falla se responde 500 para que MP reintente la notificación; ambos
  // procesos son idempotentes, así que un reintento no duplica nada.
  try {
    if (
      (topic === "subscription_preapproval" || topic === "preapproval") &&
      dataId
    ) {
      // Cambio de estado del preapproval (alta, autorización, pausa, baja).
      // Un ID que no es nuestro se ignora con 200: consultarlo en MP daría 404
      // y un 500 haría que MP reintente para siempre.
      if (!(await isKnownPreapproval(dataId))) {
        console.info("[mp-webhook] preapproval desconocido, ignorado", { dataId });
        return NextResponse.json({ ok: true, ignored: true });
      }
      const mpStatus = await fetchPreApprovalStatus(dataId);
      await processPreapprovalEvent(dataId, mpStatus);
    } else if (topic === "subscription_authorized_payment" && dataId) {
      // Cobro recurrente: si salió aprobado, renueva el período de la suscripción.
      const { preapprovalId, approved } =
        await fetchAuthorizedPaymentStatus(dataId);
      if (preapprovalId && approved) {
        await processAuthorizedPaymentApproved(preapprovalId);
      }
    }
  } catch (error) {
    console.error("[mp-webhook] fallo al procesar", {
      topic,
      dataId,
      // El SDK de MP lanza objetos planos ({ message, status, … }), no Error.
      message: errorMessage(error),
    });
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const { message, status } = error as { message?: unknown; status?: unknown };
    return [status, message].filter((v) => v != null).join(" ") || "error desconocido";
  }
  return String(error);
}
