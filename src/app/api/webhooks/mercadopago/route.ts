import { NextResponse, type NextRequest } from "next/server";
import { isValidWebhookSignature } from "@/lib/mercadopago/webhook";
import { fetchPreApprovalStatus } from "@/lib/mercadopago/subscriptions";
import { processPreapprovalEvent } from "@/lib/actions/subscription";

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
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const topic = body?.type ?? body?.topic ?? "";
  const isSubscriptionEvent =
    topic === "subscription_preapproval" || topic === "preapproval";

  if (isSubscriptionEvent && dataId) {
    fetchPreApprovalStatus(dataId)
      .then((mpStatus) => processPreapprovalEvent(dataId, mpStatus))
      .catch(console.error);
  }

  return NextResponse.json({ ok: true });
}
