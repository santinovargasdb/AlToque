"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signInWithPassword,
  requestPasswordReset,
} from "@/lib/actions/auth";
import { logAuthError } from "@/lib/auth-log";
import { EMAIL_INPUT_PATTERN, signInSchema } from "@/lib/validations/auth";

/**
 * Login con email + contraseña, con link de recuperación. La Server Action
 * re-valida con Zod; acá solo feedback inmediato + pattern estricto de email.
 */
export function PasswordLoginForm({ redirectTo }: { redirectTo: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();

    if (resetMode) {
      startTransition(async () => {
        const res = await requestPasswordReset({ email });
        if (!res.ok) {
          logAuthError("login:reset-request", res.error);
          toast.error(res.error);
          return;
        }
        setResetSent(true);
      });
      return;
    }

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisá los datos.");
      return;
    }
    startTransition(async () => {
      const res = await signInWithPassword(parsed.data);
      if (!res.ok) {
        logAuthError("login:password", res.error);
        toast.error(res.error);
        return;
      }
      // Navegación dura: el server lee la cookie nueva y el middleware
      // enruta por rol si hace falta.
      window.location.href = redirectTo;
    });
  }

  if (resetSent) {
    return (
      <div className="space-y-3 rounded-xl border border-success/30 bg-success/5 p-5 text-center">
        <MailCheck className="mx-auto size-8 text-success" />
        <p className="font-medium">Revisá tu email</p>
        <p className="text-sm text-muted-foreground">
          Si existe una cuenta para{" "}
          <span className="font-medium">{email}</span>, te enviamos un enlace
          para restablecer la contraseña.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          pattern={EMAIL_INPUT_PATTERN}
          title="Ingresá un email válido (ej: nombre@dominio.com)"
          maxLength={254}
          required
          autoFocus
        />
      </div>

      {!resetMode && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Contraseña</Label>
            <button
              type="button"
              onClick={() => setResetMode(true)}
              className="text-xs font-medium text-primary"
            >
              ¿La olvidaste?
            </button>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={72}
            required
          />
        </div>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {resetMode ? "Enviar enlace de recuperación" : "Ingresar"}
      </Button>

      {resetMode && (
        <button
          type="button"
          onClick={() => setResetMode(false)}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Volver al ingreso con contraseña
        </button>
      )}
    </form>
  );
}
