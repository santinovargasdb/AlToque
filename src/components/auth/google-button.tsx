"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/auth";

/**
 * Botón "Continuar con Google" siguiendo los lineamientos de marca oficiales
 * (fondo blanco, borde sutil, logo "G" multicolor, tipografía medium).
 *
 * Inicia el flujo OAuth de Supabase (`signInWithOAuth`): el browser navega a
 * Google → Supabase → `/auth/callback?code=&next=&role=`. Las credenciales de
 * Google viven en el dashboard de Supabase; acá no se maneja ningún secreto.
 *
 * @param redirectTo Ruta interna post-login (el callback la valida con Zod).
 * @param role Intención de registro ("provider" crea el perfil profesional);
 *   el callback SOLO la aplica a signups nuevos, nunca a cuentas existentes.
 * @param label Texto del botón (default "Continuar con Google").
 */
export function GoogleButton({
  redirectTo,
  role,
  label = "Continuar con Google",
}: {
  redirectTo: string;
  role?: Role;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    const supabase = createClient();
    // window.location.origin es el host real del browser (dev o prod);
    // debe estar en la allow-list de Redirect URLs de Supabase.
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", redirectTo);
    if (role) callback.searchParams.set("role", role);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    });

    // Si no hubo error, el browser está navegando a Google: dejamos el
    // loading activo para evitar doble click / parpadeo.
    if (error) {
      setLoading(false);
      toast.error(
        error.message.toLowerCase().includes("provider is not enabled")
          ? "El ingreso con Google no está habilitado todavía."
          : "No pudimos conectar con Google. Probá de nuevo.",
      );
    }
  }

  return (
    <button
      type="button"
      onClick={signInWithGoogle}
      disabled={loading}
      className="flex h-10 w-full items-center justify-center gap-3 rounded-md border border-border bg-white px-4 text-sm font-medium text-[#1f1f1f] shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : (
        <GoogleLogo />
      )}
      {label}
    </button>
  );
}

/** Logo "G" oficial de Google (SVG multicolor de los brand guidelines). */
function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-4 shrink-0" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
