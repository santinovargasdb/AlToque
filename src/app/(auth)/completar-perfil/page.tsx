import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, homeForRole, isProfileComplete } from "@/lib/auth";
import { CompleteProfileForm } from "@/components/auth/complete-profile-form";

export const metadata: Metadata = { title: "Completá tu perfil" };

/**
 * Onboarding post-login: los usuarios que entraron por Google/OTP sin
 * nombre o teléfono aterrizan acá (los redirige `requireCompleteProfile`
 * desde los layouts de zona) y no pueden usar el dashboard hasta completar.
 * Si el perfil ya está completo, va directo al home del rol.
 */
export default async function CompletarPerfilPage() {
  const session = await getSession();
  if (!session) redirect("/ingresar");
  if (isProfileComplete(session.profile)) {
    redirect(homeForRole(session.role));
  }

  // Precarga: Google trae full_name en el perfil (vía trigger) o en metadata.
  const metadataName = session.user.user_metadata?.full_name;
  const initialFullName =
    session.profile?.fullName ??
    (typeof metadataName === "string" ? metadataName : "");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Completá tu perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nos falta un dato clave para que puedas usar AlToque.
        </p>
      </div>
      <CompleteProfileForm
        initialFullName={initialFullName}
        initialPhone={session.profile?.phone ?? ""}
      />
    </div>
  );
}
