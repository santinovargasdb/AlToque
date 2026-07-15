import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type Role = "client" | "provider" | "admin";

/** Usuario autenticado o null (no redirige). */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Devuelve { user, role } o null si no hay sesión. */
export async function getSession() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [profile] = await db
    .select({
      role: profiles.role,
      fullName: profiles.fullName,
      phone: profiles.phone,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return { user, role: (profile?.role ?? "client") as Role, profile };
}

/** Home de cada rol (destino por defecto tras autenticar/completar perfil). */
export function homeForRole(role: Role): string {
  return role === "admin"
    ? "/admin"
    : role === "provider"
      ? "/pro/inicio"
      : "/inicio";
}

/**
 * ¿El perfil tiene los datos mínimos para operar? Nombre y teléfono son
 * obligatorios (los registros vía Google/OTP pueden no traerlos); si falta
 * alguno, el usuario debe pasar por el onboarding de /completar-perfil.
 */
export function isProfileComplete(
  profile: { fullName: string | null; phone: string | null } | undefined,
): boolean {
  return !!profile?.fullName?.trim() && !!profile?.phone?.trim();
}

/**
 * Gate de onboarding para los layouts de zona ((app) y (pro)): si hay sesión
 * pero el perfil está incompleto, redirige a /completar-perfil. No exige
 * sesión (de eso se encargan el middleware y el requireRole de cada página);
 * los admins quedan exentos (cuentas creadas manualmente).
 */
export async function requireCompleteProfile() {
  const session = await getSession();
  if (
    session &&
    session.role !== "admin" &&
    !isProfileComplete(session.profile)
  ) {
    redirect("/completar-perfil");
  }
  return session;
}

/** Exige sesión; si no hay, redirige a /ingresar. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/ingresar");
  return session;
}

/** Exige un rol específico; si no coincide, redirige a su home. */
export async function requireRole(role: Role) {
  const session = await requireUser();
  if (session.role !== role) {
    redirect(homeForRole(session.role));
  }
  return session;
}
