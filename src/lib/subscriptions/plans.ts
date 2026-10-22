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

/**
 * Días de gracia tras un cobro fallido antes de cortar el acceso (spec §6).
 * Durante la gracia la suscripción está `past_due` pero el gate sigue abierto;
 * el cron `expire-grace` corta recién al vencer este plazo.
 */
export const GRACE_DAYS = 7;

/**
 * Trabajos completados gratis antes de exigir suscripción al profesional
 * (trial de bienvenida, decisión 2026-09-28). Mientras `jobs_completed < FREE_JOBS`
 * el profesional está habilitado aunque no tenga plan: así puede comprobar que
 * la plataforma le trae trabajo antes de pagar. El gate (PostGIS + server
 * actions) habilita si `subscription_active` OR `jobs_completed < FREE_JOBS`.
 */
export const FREE_JOBS = 5;
