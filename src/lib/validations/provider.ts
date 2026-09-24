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

/** Tipos de archivo aceptados para la verificación (DNI / selfie / matrícula). */
export const ACCEPTED_DOC_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
export const MAX_DOC_BYTES = 6 * 1024 * 1024; // 6 MB

/** Oficios que exigen matrícula habilitante para trabajar. */
export const REGULATED_TRADE_SLUGS = ["gasista", "electricista"] as const;

/** ¿Alguno de los oficios del profesional exige matrícula? */
export function requiresLicense(slugs: string[]): boolean {
  return slugs.some((s) =>
    (REGULATED_TRADE_SLUGS as readonly string[]).includes(s),
  );
}

/** Motivo de rechazo de la verificación: obligatorio y accionable. */
export const rejectionReasonSchema = z
  .string()
  .trim()
  .min(5, "Explicá el motivo del rechazo (mínimo 5 caracteres).")
  .max(500, "El motivo no puede superar los 500 caracteres.");

export type VerificationFiles = {
  dniFront: FormDataEntryValue | null;
  dniBack: FormDataEntryValue | null;
  selfie: FormDataEntryValue | null;
  license: FormDataEntryValue | null;
};

/**
 * Valida el set completo de documentos de verificación.
 * La matrícula solo es obligatoria si el oficio del profesional la exige;
 * si viene igual (opcional), también se valida tipo y tamaño.
 * Devuelve el mensaje de error o `null` si todo está bien.
 */
export function validateVerificationFiles(
  files: VerificationFiles,
  opts: { licenseRequired: boolean },
): string | null {
  const required: Array<[FormDataEntryValue | null, string]> = [
    [files.dniFront, "frente del DNI"],
    [files.dniBack, "dorso del DNI"],
    [files.selfie, "selfie"],
  ];
  if (opts.licenseRequired) required.push([files.license, "matrícula"]);

  for (const [file, label] of required) {
    const err = validateDocFile(file, label);
    if (err) return err;
  }

  // Matrícula opcional pero presente → validar igual.
  if (!opts.licenseRequired && files.license instanceof File && files.license.size > 0) {
    const err = validateDocFile(files.license, "matrícula");
    if (err) return err;
  }

  return null;
}

function validateDocFile(file: FormDataEntryValue | null, label: string) {
  if (!(file instanceof File) || file.size === 0) {
    return `Subí el archivo de ${label}.`;
  }
  if (!ACCEPTED_DOC_TYPES.includes(file.type)) {
    return `El archivo de ${label} debe ser JPG, PNG, WEBP o PDF.`;
  }
  if (file.size > MAX_DOC_BYTES) {
    return `El archivo de ${label} supera el tamaño máximo (6 MB).`;
  }
  return null;
}
