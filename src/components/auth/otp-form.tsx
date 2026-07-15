"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logAuthError } from "@/lib/auth-log";
import { EMAIL_INPUT_PATTERN, emailSchema } from "@/lib/validations/auth";
import type { Role } from "@/lib/auth";

type Mode = "login" | "signup";

export function OtpForm({
  mode,
  role,
  redirectTo = "/inicio",
}: {
  mode: Mode;
  role?: Role;
  redirectTo?: string;
}) {
  const supabase = createClient();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) {
      toast.error(
        parsedEmail.error.issues[0]?.message ?? "Ingresá un email válido.",
      );
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: parsedEmail.data,
      options: {
        shouldCreateUser: isSignup,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        data: isSignup
          ? { role: role ?? "client", full_name: fullName, phone }
          : undefined,
      },
    });
    setLoading(false);

    if (error) {
      logAuthError("otp:send-code", error, { mode });
      toast.error(
        error.message.includes("Signups not allowed") || !isSignup
          ? "No encontramos una cuenta con ese email. ¿Querés registrarte?"
          : error.message,
      );
      return;
    }
    setStep("code");
    toast.success("Te enviamos un código a tu email.");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    setLoading(false);

    if (error) {
      logAuthError("otp:verify-code", error, { mode });
      toast.error("Código inválido o vencido. Probá de nuevo.");
      return;
    }
    // Navegación dura: el server lee la cookie nueva y el middleware
    // enruta por rol si hace falta.
    window.location.href = redirectTo;
  }

  if (step === "code") {
    return (
      <form onSubmit={verifyCode} className="space-y-4">
        <button
          type="button"
          onClick={() => setStep("email")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Cambiar email
        </button>
        <div className="space-y-1.5">
          <Label htmlFor="code">Código de verificación</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            required
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Enviado a {email}
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Verificar e ingresar
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="space-y-4">
      {isSignup && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Nombre y apellido</Label>
            <Input
              id="fullName"
              placeholder="Juan Pérez"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
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
            />
          </div>
        </>
      )}
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
          autoFocus={!isSignup}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        {isSignup ? "Crear cuenta" : "Enviar código"}
      </Button>
    </form>
  );
}
