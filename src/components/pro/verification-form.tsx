"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadVerification } from "@/lib/actions/provider";

export function VerificationForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [dniName, setDniName] = useState("");
  const [selfieName, setSelfieName] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await uploadVerification(formData);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("¡Documentos enviados! Un admin va a revisarlos.");
      formRef.current?.reset();
      setDniName("");
      setSelfieName("");
      router.refresh();
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-5">
      <FileField
        name="dni"
        label="Foto del DNI"
        hint="Frente del documento, legible."
        fileName={dniName}
        onPick={setDniName}
      />
      <FileField
        name="selfie"
        label="Selfie"
        hint="Tu cara, con buena luz."
        fileName={selfieName}
        onPick={setSelfieName}
      />
      <p className="text-xs text-muted-foreground">
        Tus documentos se guardan en un bucket privado y solo los ve el equipo
        de verificación. JPG, PNG, WEBP o PDF (máx. 6 MB).
      </p>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Enviar para verificación
      </Button>
    </form>
  );
}

function FileField({
  name,
  label,
  hint,
  fileName,
  onPick,
}: {
  name: string;
  label: string;
  hint: string;
  fileName: string;
  onPick: (n: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <label
        htmlFor={name}
        className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-input bg-background px-4 py-3 text-sm hover:border-primary/40"
      >
        <Upload className="size-5 text-muted-foreground" />
        <span className={fileName ? "text-foreground" : "text-muted-foreground"}>
          {fileName || `Subir ${label.toLowerCase()}`}
        </span>
      </label>
      <input
        id={name}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        required
        onChange={(e) => onPick(e.target.files?.[0]?.name ?? "")}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
