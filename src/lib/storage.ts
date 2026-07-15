import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
// BUCKETS vive en storage-buckets.ts (isomórfico): este módulo es
// server-only y los uploaders del cliente también necesitan los nombres.
import { BUCKETS } from "@/lib/storage-buckets";

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
