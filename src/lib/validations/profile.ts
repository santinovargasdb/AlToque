import { z } from "zod";

/**
 * Reglas del avatar, compartidas entre el uploader (validación instantánea
 * en el browser), la Server Action (`updateAvatar`) y el setup del bucket
 * (`docs/supabase-storage-setup.sql` fija los mismos límites server-side).
 */

/** Tamaño máximo de la foto de perfil: 2 MB. */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/**
 * MIME types permitidos → extensión del archivo subido.
 * Solo formatos raster: se excluye a propósito `image/svg+xml` (un SVG
 * servido desde un bucket público puede embeber scripts).
 */
export const AVATAR_MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/**
 * Path del objeto dentro del bucket `avatars`: `{uuid}/avatar-{timestamp}.{ext}`.
 * - Carpeta raíz = uid del dueño (lo exige la política RLS del bucket).
 * - Nombre único por timestamp → sin colisiones y sin caché vieja del browser.
 * - El regex no admite `../` ni subcarpetas: imposible salirse de la carpeta.
 */
export const updateAvatarSchema = z.object({
  path: z
    .string()
    .max(200)
    .regex(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/avatar-\d+\.(png|jpg|webp|gif|avif)$/,
      "Ruta de avatar inválida",
    ),
});

export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>;
