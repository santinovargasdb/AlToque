import { sql, eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  categories,
  providerProfiles,
  providerCategories,
} from "@/lib/db/schema";
import { ProviderProfileForm } from "@/components/pro/provider-profile-form";
import { GoogleAccountLink } from "@/components/auth/google-account-link";
import { SetPasswordButton } from "@/components/auth/set-password-button";
import { GlobalSignOutButton } from "@/components/auth/global-sign-out-button";
import { AvatarUploader } from "@/components/shared/avatar-uploader";

export default async function ProPerfilPage() {
  const { user, profile } = await requireRole("provider");
  const uid = user.id;

  const [allCats, selectedCats, scalar, coordRows] = await Promise.all([
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .orderBy(categories.name),
    db
      .select({ id: providerCategories.categoryId })
      .from(providerCategories)
      .where(eq(providerCategories.providerId, uid)),
    db
      .select({
        bio: providerProfiles.bio,
        years: providerProfiles.yearsExperience,
        radius: providerProfiles.serviceRadiusKm,
      })
      .from(providerProfiles)
      .where(eq(providerProfiles.profileId, uid))
      .limit(1),
    db.execute(
      sql`select st_y(base_location::geometry) as lat, st_x(base_location::geometry) as lng from provider_profiles where profile_id = ${uid}`,
    ) as unknown as Promise<Array<{ lat: number | null; lng: number | null }>>,
  ]);

  const pp = scalar[0];
  const coords = coordRows[0];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-bold">Mi perfil profesional</h1>
        <p className="text-muted-foreground">
          Definí tus oficios y tu zona para empezar a recibir pedidos.
        </p>
      </header>

      {/* La foto se muestra a los clientes en búsquedas y perfil público. */}
      <section className="rounded-xl border border-border bg-card p-5">
        <AvatarUploader
          userId={uid}
          initialUrl={profile?.avatarUrl ?? null}
          name={profile?.fullName ?? null}
        />
      </section>

      <ProviderProfileForm
        categories={allCats}
        initial={{
          categoryIds: selectedCats.map((c) => c.id),
          serviceRadiusKm: pp?.radius ?? 10,
          bio: pp?.bio ?? "",
          yearsExperience: pp?.years ?? null,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
        }}
      />

      {/* Métodos de acceso de la cuenta (Google + contraseña + sesiones). */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading font-semibold">Métodos de acceso</h2>
        <GoogleAccountLink returnTo="/pro/perfil" />
        <div className="h-px bg-border" />
        <SetPasswordButton email={user.email ?? ""} />
        <div className="h-px bg-border" />
        <GlobalSignOutButton />
      </section>
    </div>
  );
}
