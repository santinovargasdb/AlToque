"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { getSession, homeForRole } from "@/lib/auth";
import { getRequestOrigin } from "@/lib/url";
import { logAuthError } from "@/lib/auth-log";
import {
  signUpSchema,
  signInSchema,
  resetRequestSchema,
  updatePasswordSchema,
  completeProfileSchema,
} from "@/lib/validations/auth";

export type AuthActionResult =
  | { ok: true; needsEmailConfirm?: boolean }
  | { ok: false; error: string };

/** Traduce los errores comunes de Supabase Auth a mensajes claros en español. */
function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "Email o contraseña incorrectos.";
  }
  if (m.includes("email not confirmed")) {
    return "Tu email todavía no está confirmado. Revisá tu casilla (y spam).";
  }
  if (m.includes("user already registered")) {
    return "Ya existe una cuenta con ese email. Ingresá o recuperá tu contraseña.";
  }
  if (m.includes("password should be")) {
    return "La contraseña no cumple los requisitos de seguridad.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Demasiados intentos. Esperá unos minutos y probá de nuevo.";
  }
  return "No pudimos completar la operación. Probá de nuevo.";
}

/**
 * Registro con email + contraseña. La validación estricta (formato de email,
 * reglas de contraseña) corre acá con Zod ADEMÁS del formulario: nunca se
 * confía en el cliente. `emailRedirectTo` se construye con el origen real de
 * la request (getRequestOrigin), nunca hardcodeado a localhost.
 */
export async function signUpWithPassword(
  input: unknown,
): Promise<AuthActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  const data = parsed.data;

  const origin = await getRequestOrigin();
  const next =
    data.redirectTo ?? (data.role === "provider" ? "/pro/inicio" : "/inicio");

  const supabase = await createClient();
  const { data: res, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      // El trigger de auth (drizzle/auth-triggers.sql) crea `profiles` con esto.
      data: {
        role: data.role,
        full_name: data.fullName,
        phone: data.phone ?? "",
      },
    },
  });

  if (error) return { ok: false, error: translateAuthError(error.message) };

  // Supabase devuelve un usuario "fantasma" sin identities cuando el email ya
  // existe confirmado (para no filtrar qué emails están registrados).
  if (res.user && res.user.identities?.length === 0) {
    return {
      ok: false,
      error: "Ya existe una cuenta con ese email. Ingresá o recuperá tu contraseña.",
    };
  }

  // Sin sesión = las confirmaciones por email están activas en Supabase.
  return { ok: true, needsEmailConfirm: !res.session };
}

/** Login con email + contraseña (validado server-side con Zod). */
export async function signInWithPassword(
  input: unknown,
): Promise<AuthActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: translateAuthError(error.message) };

  return { ok: true };
}

/**
 * Envía el email de recuperación de contraseña. El link vuelve por
 * /auth/callback (type=recovery) y aterriza en /restablecer con sesión.
 */
export async function requestPasswordReset(
  input: unknown,
): Promise<AuthActionResult> {
  const parsed = resetRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Email inválido.",
    };
  }

  const origin = await getRequestOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/restablecer")}` },
  );
  if (error) return { ok: false, error: translateAuthError(error.message) };

  return { ok: true };
}

/** Cambia la contraseña del usuario logueado (flujo de recovery). */
export async function updatePassword(
  input: unknown,
): Promise<AuthActionResult> {
  const parsed = updatePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Contraseña inválida.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      error: "El enlace venció. Pedí uno nuevo desde '¿Olvidaste tu contraseña?'.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: translateAuthError(error.message) };

  return { ok: true };
}

export type CompleteProfileResult =
  | { ok: true; home: string }
  | { ok: false; error: string };

/**
 * Onboarding post-login (Tarea "completar perfil"): guarda los datos mínimos
 * que el registro vía Google/OTP no aporta (nombre y teléfono). El gate
 * `requireCompleteProfile` de los layouts bloquea el dashboard hasta que
 * esta acción complete el perfil.
 *
 * @returns `home` — la ruta del dashboard según el rol, para que el form
 *   haga la navegación dura post-guardado.
 */
export async function completeProfile(
  input: unknown,
): Promise<CompleteProfileResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "No autorizado." };

  const parsed = completeProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  try {
    await db
      .update(profiles)
      .set({
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, session.user.id));
  } catch (err) {
    logAuthError("onboarding:complete-profile", err, {
      userId: session.user.id,
    });
    return { ok: false, error: "No pudimos guardar tus datos. Probá de nuevo." };
  }

  revalidatePath("/perfil");
  revalidatePath("/pro/perfil");
  return { ok: true, home: homeForRole(session.role) };
}

/** Cierra la sesión y vuelve al inicio. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/**
 * Cierra la sesión en TODOS los dispositivos: `scope: "global"` revoca
 * todos los refresh tokens activos del usuario en Supabase (las otras
 * sesiones caen al expirar su access token, ≤1 h). Redirige a /ingresar
 * con un aviso de confirmación (query `notice`).
 */
export async function signOutEverywhere(): Promise<AuthActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) {
    logAuthError("perfil:sign-out-global", error);
    return {
      ok: false,
      error: "No pudimos cerrar las sesiones. Probá de nuevo.",
    };
  }
  redirect(
    `/ingresar?notice=${encodeURIComponent("Cerraste sesión en todos los dispositivos.")}`,
  );
}
