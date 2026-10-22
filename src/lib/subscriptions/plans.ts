/**
 * Precios de los planes de suscripción (ARS/mes) y umbral de precio fundador.
 * Única fuente de verdad: la usan `lib/actions/subscription.ts` (para crear la
 * preapproval en Mercado Pago) y el panel `/admin/suscripciones` (para estimar
 * el ingreso recurrente, MRR).
 *
 * Nota: la tabla `subscriptions` no guarda el importe por fila, así que el MRR
 * del admin es una ESTIMACIÓN. Un suscriptor fundador conserva su precio aunque
 * el padrón crezca; se asume que los primeros `FOUNDING_THRESHOLD` activos son
 * los fundadores.
 */
export const FOUNDING_THRESHOLD = 50;
export const PROVIDER_REGULAR_PRICE = 7000;
export const PROVIDER_FOUNDING_PRICE = 5000;
export const CLIENT_PRICE = 4500;
