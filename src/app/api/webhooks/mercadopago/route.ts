import { NextResponse, type NextRequest } from "next/server";
import {
  isValidWebhookSignature,
  fetchPaymentInfo,
} from "@/lib/mercadopago/webhook";
import { markPaymentHeld } from "@/lib/mercadopago/payments";

/**
 * Webhook de Mercado Pago (Checkout Pro). Verifica la firma (regla #2),
 * consulta el pago y, si está aprobado, marca el job como 'held' de forma
 * idempotente (por mp_payment_id). Responde 200 rápido salvo firma inválida.
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  let dataId = url.searchParams.get("data.id");
  let type = url.searchParams.get("type") ?? url.searchParams.get("topic");

  // MP suele mandar `data.id`/`type` en la query, pero según el evento puede
  // venir sólo en el body JSON ({ type, data: { id } }). Caemos al body.
  if (!dataId || !type) {
    const body = (await request.json().catch(() => null)) as
      | { data?: { id?: string | number }; type?: string }
      | null;
    dataId = dataId ?? (body?.data?.id != null ? String(body.data.id) : null);
    type = type ?? body?.type ?? null;
  }

  if (
    !isValidWebhookSignature({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
    })
  ) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  // Sólo nos interesan notificaciones de pago con id.
  if (type !== "payment" || !dataId) {
    return NextResponse.json({ ok: true });
  }

  const info = await fetchPaymentInfo(dataId);
  if (info.status === "approved" && info.jobId) {
    await markPaymentHeld(info.jobId, info.paymentId);
  }

  return NextResponse.json({ ok: true });
}
