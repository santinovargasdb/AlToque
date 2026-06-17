import "server-only";
import { Preference } from "mercadopago";
import { mpConfig } from "./client";

export type JobPreferenceParams = {
  jobId: string;
  title: string;
  amount: number;
  appUrl: string;
};

/** Construye el body de la preferencia de Checkout Pro para un pedido. (puro) */
export function buildJobPreferenceBody(p: JobPreferenceParams) {
  const back = `${p.appUrl}/pedido/${p.jobId}`;
  return {
    items: [
      {
        id: p.jobId,
        title: p.title,
        quantity: 1,
        unit_price: p.amount,
        currency_id: "ARS",
      },
    ],
    external_reference: p.jobId,
    notification_url: `${p.appUrl}/api/webhooks/mercadopago`,
    back_urls: {
      success: `${back}?pago=success`,
      pending: `${back}?pago=pending`,
      failure: `${back}?pago=failure`,
    },
    auto_return: "approved",
  };
}

export type CreatedPreference = { preferenceId: string; initPoint: string };

/** Crea la preferencia en MP y devuelve { preferenceId, initPoint }. */
export async function createJobPreference(
  p: JobPreferenceParams,
): Promise<CreatedPreference> {
  const pref = new Preference(mpConfig());
  const res = await pref.create({ body: buildJobPreferenceBody(p) });
  if (!res.id || !res.init_point) {
    throw new Error("MP no devolvió id/init_point para la preferencia.");
  }
  return { preferenceId: res.id, initPoint: res.init_point };
}
