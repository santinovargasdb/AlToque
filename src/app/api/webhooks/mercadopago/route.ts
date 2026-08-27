import { NextResponse, type NextRequest } from "next/server";
import { isValidWebhookSignature } from "@/lib/mercadopago/webhook";

/**
 * Webhook de Mercado Pago. Verifica la firma HMAC (regla #2) y responde 200.
 * El procesamiento de eventos de pago por operación (escrow) se dio de baja
 * con el cambio al modelo de suscripción (spec 2026-07-31-modelo-suscripcion);
 * acá se van a procesar los eventos de suscripción (`preapproval`) cuando se
 * implemente ese modelo. El endpoint queda activo para no perder la URL
 * registrada en MP ni el mecanismo de seguridad.
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  let dataId = url.searchParams.get("data.id");

  // MP suele mandar `data.id` en la query, pero según el evento puede venir
  // sólo en el body JSON ({ type, data: { id } }). Caemos al body.
  if (!dataId) {
    const body = (await request.json().catch(() => null)) as
      | { data?: { id?: string | number } }
      | null;
    dataId = body?.data?.id != null ? String(body.data.id) : null;
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

  return NextResponse.json({ ok: true });
}
