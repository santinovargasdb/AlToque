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
    .select({ role: profiles.role, fullName: profiles.fullName })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return { user, role: (profile?.role ?? "client") as Role, profile };
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
    const home =
      session.role === "admin"
        ? "/admin"
        : session.role === "provider"
          ? "/pro/inicio"
          : "/inicio";
    redirect(home);
  }
  return session;
}
