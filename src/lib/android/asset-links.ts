import { z } from "zod";

// "com.ejemplo.app": segmentos separados por punto, cada uno empieza con letra.
const packageNameSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/);

// Huella SHA-256 del certificado: 32 bytes en hex separados por ":".
const fingerprintSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);

export type AssetLinksConfig = {
  packageName: string;
  fingerprints: string[];
};

/**
 * Valida la configuración de la app Android. `fingerprints` acepta varias
 * huellas separadas por coma (la de Play App Signing y la de la clave de
 * subida). Devuelve `null` si falta algo o algún valor es inválido.
 */
export function parseAssetLinksConfig(
  packageName: string | undefined,
  fingerprints: string | undefined,
): AssetLinksConfig | null {
  const parsedName = packageNameSchema.safeParse(packageName);
  if (!parsedName.success) return null;

  const parsedFingerprints = z
    .array(fingerprintSchema)
    .min(1)
    .safeParse((fingerprints ?? "").split(",").filter((f) => f.trim() !== ""));
  if (!parsedFingerprints.success) return null;

  return {
    packageName: parsedName.data,
    fingerprints: parsedFingerprints.data,
  };
}
