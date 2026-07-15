"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutEverywhere } from "@/lib/actions/auth";
import { logAuthError } from "@/lib/auth-log";

/**
 * Seguridad avanzada: cierra la sesión en TODOS los dispositivos (revoca
 * todos los refresh tokens vía Supabase, ver `signOutEverywhere`).
 *
 * Pide confirmación de dos clics en el propio botón (sin dialogs nativos).
 * En éxito, la Server Action redirige a /ingresar con el aviso; acá solo
 * se maneja el fracaso (toast + log).
 */
export function GlobalSignOutButton() {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function run() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const res = await signOutEverywhere();
      // Solo llega acá si falló: en éxito la acción redirige a /ingresar.
      if (!res.ok) {
        logAuthError("perfil:sign-out-global-ui", res.error);
        toast.error(res.error);
        setConfirming(false);
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <span className="font-medium">Sesiones activas</span>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Cerrá tu cuenta en todos los dispositivos donde esté abierta.
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 text-destructive"
        onClick={run}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ShieldAlert className="size-4" />
        )}
        {confirming ? "¿Seguro? Cerrar todas" : "Cerrar en todos"}
      </Button>
    </div>
  );
}
