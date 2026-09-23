"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
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
      <div className="space-y-3 rounded-md border border-success/30 bg-success/5 p-5 text-center">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mx-auto text-success"
          aria-hidden="true"
        >
          <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          <path d="m16 19 2 2 4-4" />
        </svg>
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
        {pending && (
          <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
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
