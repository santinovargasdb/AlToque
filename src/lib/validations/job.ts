import { z } from "zod";
import { ALL_ASPECT_KEYS } from "@/lib/reviews/aspects";

/** Oficios habilitados (slugs de categories). */
export const CATEGORY_SLUGS = [
  "plomeria",
  "cerrajeria",
  "electricista",
  "gasista",
  "techista",
  "carpinteria",
  "pintor",
  "albanil",
] as const;

const latLng = {
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
};

/** Input de `createJob` (Server Action). */
export const createJobSchema = z
  .object({
    categoryId: z.string().uuid(),
    type: z.enum(["scheduled", "urgent"]),
    title: z.string().min(3, "Contanos qué necesitás").max(120),
    description: z.string().max(2000).optional(),
    photos: z.array(z.string().url()).max(6).default([]),
    addressText: z.string().min(3, "Ingresá una dirección"),
    ...latLng,
    scheduledAt: z.coerce.date().optional(),
    paymentMethod: z.enum(["cash", "transfer", "card"]),
    providerId: z.string().uuid().optional(),
  })
  .refine(
    (d) => d.type !== "scheduled" || !!d.scheduledAt,
    { message: "Elegí fecha y hora para un trabajo agendado", path: ["scheduledAt"] },
  );

export type CreateJobInput = z.infer<typeof createJobSchema>;

/** Input de `setFinalPrice`. */
export const setFinalPriceSchema = z.object({
  jobId: z.string().uuid(),
  finalPrice: z.number().positive().max(100_000_000),
});

/** Puntaje individual de un aspecto. */
const aspectScore = z.number().int().min(1).max(5);

/** Input de `submitReview`. Los 4 aspectos van en `aspects`; la nota general
 * la calcula la Server Action como promedio. El set correcto de claves según
 * la dirección (cliente→pro vs pro→cliente) se valida en `submitReview`. */
export const reviewSchema = z
  .object({
    jobId: z.string().uuid(),
    targetId: z.string().uuid(),
    aspects: z.record(z.enum(ALL_ASPECT_KEYS as unknown as [string, ...string[]]), aspectScore),
    comment: z.string().max(1000).optional(),
  })
  .refine((d) => Object.keys(d.aspects).length === 4, {
    message: "Calificá los 4 aspectos.",
    path: ["aspects"],
  });
