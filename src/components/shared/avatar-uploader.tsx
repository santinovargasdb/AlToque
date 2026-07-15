"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BUCKETS } from "@/lib/storage-buckets";
import { updateAvatar } from "@/lib/actions/profile";
import {
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TO_EXT,
} from "@/lib/validations/profile";

/**
 * Subida de foto de perfil al bucket público `avatars` con UX instantánea:
 *
 *  1. Validación inmediata en el cliente (solo imágenes raster, máx 2 MB)
 *     con toast de error al instante — sin tocar la red si no pasa.
 *  2. Preview inmediato con `URL.createObjectURL(file)` apenas se elige.
 *  3. Spinner superpuesto sobre el avatar + selector deshabilitado mientras
 *     sube (no hay dudas de si "está haciendo algo").
 *  4. Subida a `avatars/{userId}/avatar-{timestamp}.{ext}` (nombre único →
 *     sin colisiones ni caché vieja) y persistencia vía Server Action
 *     `updateAvatar` (Drizzle sobre `profiles.avatar_url`).
 *  5. Toast de éxito/error específico; si la persistencia falla, borra el
 *     archivo recién subido (sin huérfanos) y revierte el preview.
 *
 * Si el bucket/políticas no existen en Supabase, el toast lo dice: correr
 * `docs/supabase-storage-setup.sql`.
 *
 * @param userId Uid del usuario logueado (carpeta raíz del objeto; RLS
 *   solo permite escribir en la propia).
 * @param initialUrl Avatar actual (o null si nunca subió uno).
 * @param name Nombre para la inicial de fallback cuando no hay foto.
 */
export function AvatarUploader({
  userId,
  initialUrl,
  name,
}: {
  userId: string;
  initialUrl: string | null;
  name: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [uploading, setUploading] = useState(false);

  // Liberar el ObjectURL vigente al desmontar (evita leak de memoria).
  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  /** Cambia el preview liberando el ObjectURL anterior si lo había. */
  function swapPreview(url: string | null) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = url?.startsWith("blob:") ? url : null;
    setPreview(url);
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset del input: permite re-elegir el mismo archivo tras un error.
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;

    // ── 1. Validación instantánea (sin red) ──
    const ext = AVATAR_MIME_TO_EXT[file.type];
    if (!file.type.startsWith("image/") || !ext) {
      toast.error("Elegí una imagen (JPG, PNG, WebP, GIF o AVIF).");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error("La imagen no puede superar los 2 MB.");
      return;
    }

    // ── 2. Preview inmediato ──
    swapPreview(URL.createObjectURL(file));
    setUploading(true);

    // ── 3. Subida con nombre único (timestamp → sin caché vieja) ──
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const supabase = createClient();
    const { error } = await supabase.storage
      .from(BUCKETS.avatars)
      .upload(path, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      setUploading(false);
      swapPreview(initialUrl);
      console.error("[storage] avatar:upload", error.message);
      const msg = error.message.toLowerCase();
      toast.error(
        msg.includes("bucket not found")
          ? "Falta el bucket 'avatars' en Supabase: corré docs/supabase-storage-setup.sql."
          : msg.includes("row-level security") || msg.includes("policy")
            ? "Faltan permisos del bucket 'avatars': corré docs/supabase-storage-setup.sql."
            : "No pudimos subir la foto. Revisá tu conexión y probá de nuevo.",
      );
      return;
    }

    // ── 4. Persistir en profiles (Drizzle, server-side) ──
    const res = await updateAvatar({ path });
    setUploading(false);

    if (!res.ok) {
      // Rollback: no dejar el archivo huérfano ni un preview mentiroso.
      void supabase.storage.from(BUCKETS.avatars).remove([path]);
      swapPreview(initialUrl);
      toast.error(res.error);
      return;
    }

    toast.success("Foto de perfil actualizada correctamente.");
    router.refresh();
  }

  const fallbackInitial = (name ?? "?").charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <div className="flex size-24 items-center justify-center overflow-hidden rounded-full border border-border bg-primary/10 font-heading text-3xl font-bold text-primary">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Foto de perfil"
              className="size-full object-cover"
            />
          ) : (
            fallbackInitial
          )}
        </div>

        {uploading && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45"
            role="status"
            aria-label="Subiendo foto de perfil"
          >
            <Loader2 className="size-7 animate-spin text-white" />
          </div>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Cambiar foto de perfil"
          className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-60"
        >
          <Camera className="size-4" />
        </button>
      </div>

      <div className="min-w-0 text-sm">
        <p className="font-medium">Foto de perfil</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          JPG, PNG, WebP, GIF o AVIF · máximo 2 MB.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={onPick}
        disabled={uploading}
      />
    </div>
  );
}
