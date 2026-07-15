"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeProfile } from "@/lib/actions/auth";
import { logAuthError } from "@/lib/auth-log";
import { completeProfileSchema } from "@/lib/validations/auth";

/**
 * Form de datos básicos del perfil (nombre y teléfono), con doble uso:
 *  - `mode="onboarding"` (/completar-perfil): al guardar navega (hard) al
 *    home del rol que devuelve la Server Action, re-evaluando el gate.
 *  - `mode="edit"` (/perfil): al guardar refresca la página en el lugar.
 *
 * Valida en vivo con el mismo schema Zod que usa el servidor.
 *
 * @param initialFullName Nombre precargado (de Google viene en el perfil).
 * @param initialPhone Teléfono precargado si existiera.
 * @param mode Comportamiento post-guardado (default "onboarding").
 */
export function CompleteProfileForm({
  initialFullName,
  initialPhone,
  mode = "onboarding",
}: {
  initialFullName: string;
  initialPhone: string;
  mode?: "onboarding" | "edit";
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = completeProfileSchema.safeParse({ fullName, phone });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisá los datos.");
      return;
    }
    startTransition(async () => {
      const res = await completeProfile(parsed.data);
      if (!res.ok) {
        logAuthError("onboarding:submit", res.error, { mode });
        toast.error(res.error);
        return;
      }
      if (mode === "edit") {
        toast.success("Datos actualizados.");
        router.refresh();
        return;
      }
      toast.success("¡Listo! Tu perfil quedó completo.");
      // Navegación dura: los layouts re-evalúan el gate con el perfil nuevo.
      window.location.href = res.home;
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="fullName">Nombre y apellido</Label>
        <Input
          id="fullName"
          placeholder="Juan Pérez"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          minLength={2}
          maxLength={120}
          required
          autoFocus={!initialFullName}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Teléfono</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          placeholder="11 2345 6789"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          minLength={6}
          maxLength={25}
          required
          autoFocus={!!initialFullName}
        />
        <p className="text-xs text-muted-foreground">
          Lo usamos para coordinar los trabajos. No se muestra públicamente.
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {mode === "edit" ? "Guardar cambios" : "Guardar y continuar"}
      </Button>
    </form>
  );
}
