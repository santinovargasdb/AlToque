import { describe, it, expect } from "vitest";
import { calculateCommission } from "@/lib/mercadopago/commission";

// Comisión = única fuente de verdad. Casos borde de redondeo en ARS.
describe("calculateCommission", () => {
  it("calcula comisión y neto con tasa por defecto", () => {
    const r = calculateCommission(10000, 0.12);
    expect(r.commissionAmount).toBe(1200);
    expect(r.providerNet).toBe(8800);
    expect(r.rate).toBe(0.12);
  });

  it("redondea a 2 decimales (centavos)", () => {
    const r = calculateCommission(9999.99, 0.12);
    // 9999.99 * 0.12 = 1199.9988 → 1199.999... → 1200.00
    expect(r.commissionAmount).toBe(1200);
    expect(r.providerNet).toBe(8799.99);
  });

  it("suma comisión + neto == precio final", () => {
    const price = 33333.33;
    const r = calculateCommission(price, 0.15);
    expect(r.commissionAmount + r.providerNet).toBeCloseTo(price, 2);
  });

  it("tasa 0 → comisión 0", () => {
    const r = calculateCommission(50000, 0);
    expect(r.commissionAmount).toBe(0);
    expect(r.providerNet).toBe(50000);
  });

  it("rechaza precio negativo", () => {
    expect(() => calculateCommission(-1, 0.12)).toThrow();
  });

  it("rechaza tasa fuera de rango", () => {
    expect(() => calculateCommission(1000, 1.5)).toThrow();
  });
});
