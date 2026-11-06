import "server-only";
import { PreApproval } from "mercadopago";
import { mpConfig } from "./client";

const PLAN_LABELS: Record<"provider_monthly" | "client_monthly", string> = {
  provider_monthly: "AlToque Pro — Suscripción profesional mensual",
  client_monthly: "AlToque Premium — Suscripción cliente mensual",
};

export type PreApprovalResult = {
  preapprovalId: string;
  initPoint: string;
};

/**
 * Crea un preapproval (suscripción recurrente) en Mercado Pago y devuelve
 * el ID y la URL de pago a la que redirigir al usuario.
 */
export async function createPreApproval({
  payerEmail,
  plan,
  amount,
  backUrl,
}: {
  payerEmail: string;
  plan: "provider_monthly" | "client_monthly";
  amount: number;
  backUrl: string;
}): Promise<PreApprovalResult> {
  const preApproval = new PreApproval(mpConfig());

  const result = await preApproval.create({
    body: {
      back_url: backUrl,
      payer_email: payerEmail,
      reason: PLAN_LABELS[plan],
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: amount,
        currency_id: "ARS",
      },
      status: "pending",
    },
  });

  if (!result.id || !result.init_point) {
    throw new Error(
      "Mercado Pago no devolvió ID o URL de pago al crear la suscripción.",
    );
  }

  return { preapprovalId: result.id, initPoint: result.init_point };
}

/** Consulta el estado actual de un preapproval en MP. */
export async function fetchPreApprovalStatus(
  preapprovalId: string,
): Promise<"pending" | "authorized" | "paused" | "cancelled"> {
  const preApproval = new PreApproval(mpConfig());
  const result = await preApproval.get({ id: preapprovalId });
  return (result.status ?? "pending") as
    | "pending"
    | "authorized"
    | "paused"
    | "cancelled";
}

/**
 * Estado y link de pago de un preapproval, o `null` si MP no lo encuentra.
 * Cualquier otro error se propaga: no saber el estado no es lo mismo que no
 * existir, y crear otro preapproval podría dejar un pago sin registrar.
 */
export async function fetchPreApproval(
  preapprovalId: string,
): Promise<{ status: string | null; initPoint: string | null } | null> {
  const preApproval = new PreApproval(mpConfig());
  try {
    const result = await preApproval.get({ id: preapprovalId });
    return {
      status: result.status ?? null,
      initPoint: result.init_point ?? null,
    };
  } catch (error) {
    // El SDK de MP lanza objetos planos ({ message, status, … }), no Error.
    if ((error as { status?: unknown } | null)?.status === 404) return null;
    throw error;
  }
}

/**
 * Cambia el estado de un preapproval en MP. `paused` frena los débitos y se
 * puede revertir con `authorized`; `cancelled` es definitivo (MP no permite
 * reactivar un preapproval cancelado).
 */
export async function setPreApprovalStatus(
  preapprovalId: string,
  status: "authorized" | "paused" | "cancelled",
): Promise<void> {
  const preApproval = new PreApproval(mpConfig());
  await preApproval.update({ id: preapprovalId, body: { status } });
}

/**
 * Consulta un "authorized payment" (cobro recurrente de una suscripción) y
 * devuelve a qué preapproval pertenece y si el cobro quedó aprobado. Lo dispara
 * el webhook con topic `subscription_authorized_payment`.
 *
 * ⚠️ SHAPE ASUMIDO (verificar en el sandbox de MP): el SDK `mercadopago` no
 * expone este recurso, así que se consulta por REST a
 * `GET /authorized_payments/{id}`. Se asume que la respuesta trae
 * `preapproval_id` y `payment.status` (`"approved"` cuando el cobro salió OK).
 * Si el shape real difiere, SOLO hay que ajustar el parseo de abajo: la lógica
 * de negocio (processAuthorizedPaymentApproved) es independiente y está testeada.
 */
export async function fetchAuthorizedPaymentStatus(
  authorizedPaymentId: string,
): Promise<{ preapprovalId: string | null; approved: boolean }> {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MP_ACCESS_TOKEN no configurado.");
  }
  const res = await fetch(
    `https://api.mercadopago.com/authorized_payments/${authorizedPaymentId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    throw new Error(
      `MP authorized_payment ${authorizedPaymentId}: HTTP ${res.status}`,
    );
  }
  const data = (await res.json()) as {
    preapproval_id?: string;
    payment?: { status?: string };
  };
  return {
    preapprovalId: data.preapproval_id ?? null,
    approved: data.payment?.status === "approved",
  };
}
