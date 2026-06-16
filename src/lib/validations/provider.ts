import { z } from "zod";

/**
 * Perfil del profesional (onboarding): oficios, zona base, radio, bio.
 * lat/lng son opcionales: el form los provee (autocomplete o geolocalización)
 * y, si faltan, la action geocodifica `addressText` server-side.
 */
export const providerProfileSchema = z.object({
  categoryIds: z
    .array(z.string().uuid())
    .min(1, "Elegí al menos un oficio")
    .max(8),
  addressText: z.string().min(3, "Ingresá tu dirección o zona de trabajo"),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  serviceRadiusKm: z.coerce.number().int().min(1).max(100),
  bio: z.string().max(1000).optional(),
  yearsExperience: z.coerce.number().int().min(0).max(80).optional(),
});

export type ProviderProfileInput = z.infer<typeof providerProfileSchema>;

/** Tipos de archivo aceptados para la verificación (DNI / selfie). */
export const ACCEPTED_DOC_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
export const MAX_DOC_BYTES = 6 * 1024 * 1024; // 6 MB
