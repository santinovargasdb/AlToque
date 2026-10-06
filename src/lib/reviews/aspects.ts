/**
 * Fuente central de los aspectos de reseña (KPIs). Única verdad para UI,
 * validación (Zod) y agregación. Los aspectos difieren según quién reseña:
 * el cliente puntúa al profesional y el profesional al cliente.
 */

/** Las 8 claves posibles (para el enum de DB y la validación Zod). */
export const ALL_ASPECT_KEYS = [
  "punctuality",
  "quality",
  "communication",
  "price",
  "respect",
  "availability",
  "clarity",
  "payment",
] as const;

export type AspectKey = (typeof ALL_ASPECT_KEYS)[number];

export type AspectDef = { readonly key: AspectKey; readonly label: string };

/** Aspectos que el CLIENTE puntúa del PROFESIONAL. */
export const PROVIDER_ASPECTS = [
  { key: "punctuality", label: "Puntualidad" },
  { key: "quality", label: "Calidad del trabajo" },
  { key: "communication", label: "Trato y comunicación" },
  { key: "price", label: "Precio justo" },
] as const satisfies readonly AspectDef[];

/** Aspectos que el PROFESIONAL puntúa del CLIENTE. */
export const CLIENT_ASPECTS = [
  { key: "respect", label: "Trato y respeto" },
  { key: "availability", label: "Puntualidad / disponibilidad" },
  { key: "clarity", label: "Claridad del pedido" },
  { key: "payment", label: "Pago acordado" },
] as const satisfies readonly AspectDef[];

/** Dirección de la reseña: quién puntúa a quién. */
export type ReviewDirection = "client_to_provider" | "provider_to_client";

/** Set de aspectos (con label) de una dirección. */
export function aspectsFor(direction: ReviewDirection): readonly AspectDef[] {
  return direction === "client_to_provider" ? PROVIDER_ASPECTS : CLIENT_ASPECTS;
}

/** Solo las claves de una dirección (orden estable). */
export function aspectKeysFor(direction: ReviewDirection): AspectKey[] {
  return aspectsFor(direction).map((a) => a.key);
}

const LABELS: Record<AspectKey, string> = Object.fromEntries(
  [...PROVIDER_ASPECTS, ...CLIENT_ASPECTS].map((a) => [a.key, a.label]),
) as Record<AspectKey, string>;

/** Etiqueta legible de una clave de aspecto. */
export function aspectLabel(key: string): string {
  return LABELS[key as AspectKey] ?? key;
}

/** Nota general = promedio de los puntajes, redondeado a 1 decimal. */
export function generalFromAspects(scores: number[]): number {
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg * 10) / 10;
}
