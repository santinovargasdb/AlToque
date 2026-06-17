import { z } from "zod";

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
    priceEstimate: z.coerce.number().positive().max(100_000_000).optional(),
  })
  .refine(
    (d) => d.type !== "scheduled" || !!d.scheduledAt,
    { message: "Elegí fecha y hora para un trabajo agendado", path: ["scheduledAt"] },
  )
  .refine(
    (d) => d.paymentMethod === "cash" || (d.priceEstimate ?? 0) > 0,
    {
      message: "Ingresá un precio estimado para pagar por la app",
      path: ["priceEstimate"],
    },
  );

export type CreateJobInput = z.infer<typeof createJobSchema>;

/** Input de `setFinalPrice`. */
export const setFinalPriceSchema = z.object({
  jobId: z.string().uuid(),
  finalPrice: z.number().positive().max(100_000_000),
});

/** Input de `submitReview`. */
export const reviewSchema = z.object({
  jobId: z.string().uuid(),
  targetId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});
