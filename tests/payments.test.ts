import { describe, it, expect } from "vitest";
import { createJobSchema } from "@/lib/validations/job";

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
