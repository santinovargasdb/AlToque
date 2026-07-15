import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { CompleteProfileForm } from "@/components/auth/complete-profile-form";
import { GoogleAccountLink } from "@/components/auth/google-account-link";
import { SetPasswordButton } from "@/components/auth/set-password-button";
import { GlobalSignOutButton } from "@/components/auth/global-sign-out-button";
import { AvatarUploader } from "@/components/shared/avatar-uploader";
import { SignOutButton } from "@/components/shared/sign-out-button";

export const metadata: Metadata = { title: "Mi perfil" };

/**
 * Configuración de la cuenta del cliente: datos de contacto (editables con
 * la misma acción del onboarding) y métodos de acceso — vincular/desvincular
 * Google y configurar contraseña (anti-lockout, ver GoogleAccountLink).
 */
export default async function PerfilClientePage() {
  const { user, profile } = await requireRole("client");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Mi perfil</h1>
        <SignOutButton />
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading font-semibold">Datos de contacto</h2>
        <p className="mb-4 mt-0.5 text-sm text-muted-foreground">
          {user.email}
        </p>
        <div className="mb-5">
          <AvatarUploader
            userId={user.id}
            initialUrl={profile?.avatarUrl ?? null}
            name={profile?.fullName ?? null}
          />
        </div>
        <CompleteProfileForm
          mode="edit"
          initialFullName={profile?.fullName ?? ""}
          initialPhone={profile?.phone ?? ""}
        />
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading font-semibold">Métodos de acceso</h2>
        <GoogleAccountLink returnTo="/perfil" />
        <div className="h-px bg-border" />
        <SetPasswordButton email={user.email ?? ""} />
        <div className="h-px bg-border" />
        <GlobalSignOutButton />
      </section>
    </div>
  );
}
