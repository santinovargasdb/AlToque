"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { BUCKETS } from "@/lib/storage-buckets";
import { updateAvatarSchema } from "@/lib/validations/profile";

export type UpdateAvatarResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Guarda la nueva foto de perfil tras la subida al bucket `avatars`.
 *
 * El cliente sube el archivo (RLS solo le permite su propia carpeta) y acá
 * se re-valida TODO server-side:
 *  - forma del path con Zod (`{uuid}/avatar-{ts}.{ext}`, sin traversal),
 *  - que la carpeta sea la del usuario logueado (nadie pisa avatares ajenos),
 * y recién entonces se persiste la URL pública en `profiles.avatar_url` con
 * Drizzle. Best-effort: borra el archivo anterior del bucket (service_role)
 * para no acumular huérfanos; si esa limpieza falla no bloquea nada.
 */
export async function updateAvatar(
  input: unknown,
): Promise<UpdateAvatarResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "No autorizado." };

  const parsed = updateAvatarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Archivo inválido." };
  const { path } = parsed.data;

  // El path DEBE estar dentro de la carpeta del propio usuario.
  if (!path.startsWith(`${session.user.id}/`)) {
    return { ok: false, error: "No autorizado." };
  }

  // getPublicUrl no hace red: solo construye la URL canónica del objeto.
  const supabase = await createClient();
  const { data } = supabase.storage.from(BUCKETS.avatars).getPublicUrl(path);
  const url = data.publicUrl;

  const previousUrl = session.profile?.avatarUrl ?? null;

  await db
    .update(profiles)
    .set({ avatarUrl: url, updatedAt: new Date() })
    .where(eq(profiles.id, session.user.id));

  // Limpieza del avatar anterior (best-effort, nunca bloquea la operación).
  const marker = `/object/public/${BUCKETS.avatars}/`;
  const oldPath = previousUrl?.includes(marker)
    ? decodeURIComponent(previousUrl.split(marker)[1] ?? "")
    : null;
  if (oldPath && oldPath !== path && oldPath.startsWith(`${session.user.id}/`)) {
    try {
      await createServiceClient()
        .storage.from(BUCKETS.avatars)
        .remove([oldPath]);
    } catch {
      // El archivo viejo queda huérfano; no es un error para el usuario.
    }
  }

  revalidatePath("/perfil");
  revalidatePath("/pro/perfil");
  if (session.role === "provider") {
    revalidatePath(`/profesional/${session.user.id}`);
  }
  return { ok: true, url };
}
