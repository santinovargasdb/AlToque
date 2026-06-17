import { describe, it, expect } from "vitest";
import { createJobSchema } from "@/lib/validations/job";
import { buildJobPreferenceBody } from "@/lib/mercadopago/preference";

const base = {
  categoryId: "11111111-1111-1111-1111-111111111111",
  type: "scheduled" as const,
  title: "Pérdida de agua",
  addressText: "Av. Siempreviva 742",
  scheduledAt: new Date(Date.now() + 86_400_000),
  photos: [],
};

describe("createJobSchema · priceEstimate", () => {
  it("exige priceEstimate > 0 cuando el pago es transfer/card", () => {
    const r = createJobSchema.safeParse({ ...base, paymentMethod: "transfer" });
    expect(r.success).toBe(false);
  });

  it("acepta transfer/card con priceEstimate válido", () => {
    const r = createJobSchema.safeParse({
      ...base,
      paymentMethod: "transfer",
      priceEstimate: 15000,
    });
    expect(r.success).toBe(true);
  });

  it("no exige priceEstimate cuando el pago es cash", () => {
    const r = createJobSchema.safeParse({ ...base, paymentMethod: "cash" });
    expect(r.success).toBe(true);
  });
});

describe("buildJobPreferenceBody", () => {
  const body = buildJobPreferenceBody({
    jobId: "job-1",
    title: "Pérdida de agua",
    amount: 15000,
    appUrl: "https://altoque.app",
  });

  it("arma un item ARS con el monto del estimado", () => {
    expect(body.items[0]).toMatchObject({
      id: "job-1",
      title: "Pérdida de agua",
      quantity: 1,
      unit_price: 15000,
      currency_id: "ARS",
    });
  });

  it("setea external_reference, notification_url y back_urls del job", () => {
    expect(body.external_reference).toBe("job-1");
    expect(body.notification_url).toBe(
      "https://altoque.app/api/webhooks/mercadopago",
    );
    expect(body.back_urls).toEqual({
      success: "https://altoque.app/pedido/job-1?pago=success",
      pending: "https://altoque.app/pedido/job-1?pago=pending",
      failure: "https://altoque.app/pedido/job-1?pago=failure",
    });
    expect(body.auto_return).toBe("approved");
  });
});

