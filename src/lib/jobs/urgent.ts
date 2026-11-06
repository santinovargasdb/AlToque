/**
 * Plazo de un pedido urgente para que un profesional lo acepte. Única fuente de
 * verdad: la usan la cuenta regresiva, la espera del cliente, el listado, el
 * aceptar y el cron. Isomórfico (sin dependencias de servidor).
 */
export const URGENT_JOB_TTL_MINUTES = 10;
export const URGENT_JOB_TTL_MS = URGENT_JOB_TTL_MINUTES * 60 * 1000;
