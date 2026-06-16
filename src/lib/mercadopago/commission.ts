/**
 * ÚNICA fuente de verdad de la comisión (regla no negociable #4).
 * Nunca duplicar esta fórmula en otro lado.
 *
 * - `rate` se snapshotea en el job al crearlo (jobs.commission_rate).
 * - `amount` se calcula sobre el precio final cuando el profesional lo carga.
 * - `marketplace_fee` que se manda a Mercado Pago == `amount`.
 *
 * Lee la tasa por defecto directo de process.env (con fallback 0.12) para
 * mantener esta lógica pura y testeable sin depender de la validación de env.
 */
function readDefaultRate(): number {
  const raw = Number(process.env.COMMISSION_RATE ?? "0.12");
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.12;
}

/** Comisión por defecto del marketplace (ej. 0.12). */
export const DEFAULT_COMMISSION_RATE = readDefaultRate();

/** Redondeo a 2 decimales (centavos ARS) evitando errores de float. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export type CommissionBreakdown = {
  /** Tasa aplicada (snapshot), ej. 0.12. */
  rate: number;
  /** Precio final del trabajo. */
  finalPrice: number;
  /** Comisión de la plataforma (== marketplace_fee de MP). */
  commissionAmount: number;
  /** Neto que recibe el profesional. */
  providerNet: number;
};

/**
 * Calcula la comisión sobre el precio final.
 * @param finalPrice precio total del trabajo en ARS.
 * @param rate tasa snapshot del job (default: la global).
 */
export function calculateCommission(
  finalPrice: number,
  rate: number = DEFAULT_COMMISSION_RATE,
): CommissionBreakdown {
  if (!Number.isFinite(finalPrice) || finalPrice < 0) {
    throw new Error(`finalPrice inválido: ${finalPrice}`);
  }
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new Error(`commissionRate inválida: ${rate}`);
  }

  const commissionAmount = round2(finalPrice * rate);
  const providerNet = round2(finalPrice - commissionAmount);

  return { rate, finalPrice: round2(finalPrice), commissionAmount, providerNet };
}
