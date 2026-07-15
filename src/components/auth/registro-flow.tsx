"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Wrench, ArrowLeft } from "lucide-react";
import { OtpForm } from "./otp-form";
import { PasswordSignupForm } from "./password-signup-form";
import { GoogleButton } from "./google-button";
import { AuthDivider } from "./auth-divider";
import type { Role } from "@/lib/auth";

export function RegistroFlow({ initialRole }: { initialRole?: Role }) {
  const [role, setRole] = useState<Role | null>(initialRole ?? null);
  const [method, setMethod] = useState<"password" | "otp">("password");

  if (role) {
    const redirectTo = role === "provider" ? "/pro/inicio" : "/inicio";
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setRole(null)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Cambiar tipo de cuenta
        </button>
        <div>
          <h1 className="font-heading text-2xl font-bold">
            {role === "provider" ? "Registro de profesional" : "Crear cuenta"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {role === "provider"
              ? "Después vas a poder cargar tus oficios y verificar tu identidad."
              : method === "password"
                ? "Creá tu cuenta con email y contraseña."
                : "Te enviamos un código por email para confirmar."}
          </p>
        </div>
        {/* El rol elegido viaja como intención al callback: Google no puede
            mandarlo en los metadatos, así que /auth/callback lo aplica solo
            a este signup nuevo (nunca a cuentas existentes). */}
        <GoogleButton
          redirectTo={redirectTo}
          role={role}
          label="Registrarme con Google"
        />

        <AuthDivider />

        {method === "password" ? (
          <PasswordSignupForm role={role} redirectTo={redirectTo} />
        ) : (
          <OtpForm mode="signup" role={role} redirectTo={redirectTo} />
        )}
        <button
          type="button"
          onClick={() =>
            setMethod(method === "password" ? "otp" : "password")
          }
          className="w-full text-center text-sm font-medium text-primary"
        >
          {method === "password"
            ? "Prefiero registrarme con un código por email"
            : "Prefiero registrarme con contraseña"}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tenés cuenta?{" "}
          <Link href="/ingresar" className="font-medium text-primary">
            Ingresá
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Creá tu cuenta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ¿Cómo querés usar AlToque?
        </p>
      </div>

      <div className="grid gap-3">
        <button
          type="button"
          onClick={() => setRole("client")}
          className="flex items-start gap-3 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-primary/40"
        >
          <span className="mt-0.5 flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="size-5" />
          </span>
          <span>
            <span className="block font-medium">Necesito un servicio</span>
            <span className="block text-sm text-muted-foreground">
              Buscar y contratar profesionales.
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setRole("provider")}
          className="flex items-start gap-3 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-action/40"
        >
          <span className="mt-0.5 flex size-9 items-center justify-center rounded-full bg-action/10 text-action">
            <Wrench className="size-5" />
          </span>
          <span>
            <span className="block font-medium">Ofrezco mi oficio</span>
            <span className="block text-sm text-muted-foreground">
              Recibir pedidos y cobrar por mis trabajos.
            </span>
          </span>
        </button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{" "}
        <Link href="/ingresar" className="font-medium text-primary">
          Ingresá
        </Link>
      </p>
    </div>
  );
}
