import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

/** Buckets de Supabase Storage (ver drizzle/storage.sql). */
export const BUCKETS = {
  /** Privado: DNI + selfie de verificación. */
  verification: "verification",
  /** Público: fotos de los problemas/trabajos. */
  jobPhotos: "job-photos",
  /** Público: avatares. */
  avatars: "avatars",
} as const;

/**
 * URL firmada temporal para un archivo del bucket privado de verificación.
 * Solo se usa server-side (panel admin) con service_role.
 */
export async function signedVerificationUrl(
  path: string,
  expiresInSeconds = 600,
): Promise<string | null> {
  if (!path) return null;
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(BUCKETS.verification)
    .createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}
