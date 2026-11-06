import { z } from "zod";

export const REPORT_REASONS = [
  "no_show",
  "not_completed",
  "theft_or_damage",
  "bad_behavior",
  "payment",
  "other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  no_show: "No vino",
  not_completed: "No terminó el trabajo",
  theft_or_damage: "Robo o daño",
  bad_behavior: "Mal trato",
  payment: "Problema con el pago",
  other: "Otro",
};

/** Antes de que haya un profesional trabajando no hay nada que reportar. */
const NOT_REPORTABLE_STATUSES = ["requested", "broadcasting"];

export function isReportableStatus(status: string): boolean {
  return !NOT_REPORTABLE_STATUSES.includes(status);
}

/** `cancel_reason` de un pedido que el cliente cerró como "no se hizo". */
export const NOT_COMPLETED_CANCEL_REASON = "not_completed";

const reportFields = {
  reason: z.enum(REPORT_REASONS, { message: "Elegí un motivo." }),
  description: z
    .string()
    .trim()
    .min(10, "Contá qué pasó (mínimo 10 caracteres).")
    .max(1000, "La descripción no puede superar los 1000 caracteres."),
};

export const createReportSchema = z.object({
  jobId: z.string().uuid(),
  ...reportFields,
});

/** Cierre del trabajo por el cliente: "no se hizo" exige contar qué pasó. */
export const closeJobSchema = z.discriminatedUnion("outcome", [
  z.object({ jobId: z.string().uuid(), outcome: z.literal("done") }),
  z.object({
    jobId: z.string().uuid(),
    outcome: z.literal("not_done"),
    ...reportFields,
  }),
]);

/** Nota del admin al cerrar un reporte o suspender: obligatoria. */
export const resolveReportSchema = z.object({
  reportId: z.string().uuid(),
  note: z
    .string()
    .trim()
    .min(5, "Escribí una nota (mínimo 5 caracteres).")
    .max(500, "La nota no puede superar los 500 caracteres."),
});
