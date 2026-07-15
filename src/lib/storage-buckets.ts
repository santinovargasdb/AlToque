/**
 * Buckets de Supabase Storage (ver drizzle/storage.sql y
 * docs/supabase-storage-setup.sql). Módulo isomórfico a propósito:
 * lo importan tanto Server Actions como componentes cliente que suben
 * archivos con el anon key (la seguridad la dan las políticas RLS).
 */
export const BUCKETS = {
  /** Privado: DNI + selfie de verificación. */
  verification: "verification",
  /** Público: fotos de los problemas/trabajos. */
  jobPhotos: "job-photos",
  /** Público: avatares. */
  avatars: "avatars",
} as const;
