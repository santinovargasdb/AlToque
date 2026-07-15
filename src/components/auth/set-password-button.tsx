"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/lib/actions/auth";
import { logAuthError } from "@/lib/auth-log";

/**
 * Envía el email para configurar (o cambiar) la contraseña de la cuenta,
 * reutilizando el flujo de recovery (`requestPasswordReset` → link →
 * /restablecer). Es la vía para que un usuario que entró solo con Google/OTP
 * tenga contraseña propia antes de desvincular Google (anti-lockout).
 *
 * @param email Email de la cuenta logueada (solo para mostrar el destino).
 */
export function SetPasswordButton({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function send() {
    startTransition(async () => {
      const res = await requestPasswordReset({ email });
      if (!res.ok) {
        logAuthError("perfil:set-password", res.error);
        toast.error(res.error);
        return;
      }
      setSent(true);
      toast.success("Te enviamos un email para configurar tu contraseña.");
    });
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <span className="font-medium">Contraseña</span>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {sent
            ? `Revisá ${email} y seguí el enlace para elegirla.`
            : "Configurala o cambiala con un enlace por email."}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0"
        onClick={send}
        disabled={pending || sent}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <KeyRound className="size-4" />
        )}
        {sent ? "Email enviado" : "Configurar"}
      </Button>
    </div>
  );
}
