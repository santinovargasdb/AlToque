"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "job-photos";
const MAX = 6;

/** Sube fotos del problema al bucket público y devuelve sus URLs. */
export function JobPhotosUploader({
  userId,
  value,
  onChange,
}: {
  userId: string;
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    if (value.length + files.length > MAX) {
      toast.error(`Hasta ${MAX} fotos.`);
      return;
    }
    setUploading(true);
    const urls: string[] = [];
    for (const file of files) {
      const path = `${userId}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        toast.error("No se pudo subir una foto.");
        continue;
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    onChange([...value, ...urls]);
  }

  function remove(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((url) => (
          <div
            key={url}
            className="relative size-20 overflow-hidden rounded-lg border border-border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Foto del problema" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => remove(url)}
              className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        {value.length < MAX && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input text-xs text-muted-foreground hover:border-primary/40"
          >
            {uploading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <Camera className="size-5" />
                Foto
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onPick}
      />
    </div>
  );
}
