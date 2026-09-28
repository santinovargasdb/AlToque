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
