"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordFields } from "./password-fields";
import { signUpWithPassword } from "@/lib/actions/auth";
import {
  EMAIL_INPUT_PATTERN,
  signUpSchema,
  PASSWORD_RULES,
} from "@/lib/validations/auth";
import type { Role } from "@/lib/auth";

/**
 * Registro con contraseña: campos fijos (nombre, teléfono, email, contraseña,
 * repetir contraseña) con validación en tiempo real. La Server Action
 * re-valida todo con el mismo schema Zod.
 */
export function PasswordSignupForm({
  role,
  redirectTo,
}: {
  role: Role;
  redirectTo: string;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const passwordOk = PASSWORD_RULES.every((r) => r.test(password));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      role,
      fullName,
      phone,
      email,
      password,
      confirmPassword,
      redirectTo,
    };
    // Validación inmediata en el cliente (mismo schema que el servidor).
    const parsed = signUpSchema.safeParse(input);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisá los datos.");
      return;
    }
    startTransition(async () => {
      const res = await signUpWithPassword(parsed.data);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.needsEmailConfirm) {
        setSent(true);
        return;
      }
      // Confirmación desactivada: ya hay sesión → navegación dura para que
      // el middleware enrute por rol con la cookie nueva.
      window.location.href = redirectTo;
    });
  }

  if (sent) {
    return (
      <div className="space-y-3 rounded-xl border border-success/30 bg-success/5 p-5 text-center">
        <MailCheck className="mx-auto size-8 text-success" />
        <p className="font-medium">Revisá tu email</p>
        <p className="text-sm text-muted-foreground">
          Te enviamos un enlace a <span className="font-medium">{email}</span>{" "}
          para confirmar tu cuenta. Al confirmarla vas a entrar directo.
        </p>
      </div>
    );
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
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Teléfono (opcional)</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          placeholder="11 2345 6789"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={25}
        />
      </div>
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
        />
      </div>

      <PasswordFields
        password={password}
        confirmPassword={confirmPassword}
        onPasswordChange={setPassword}
        onConfirmChange={setConfirmPassword}
      />

      <Button
        type="submit"
        className="w-full"
        disabled={pending || !passwordOk || password !== confirmPassword}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Crear cuenta
      </Button>
    </form>
  );
}
