import { requireRole } from "@/lib/auth";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { ComingSoon } from "@/components/shared/coming-soon";

export default async function PerfilClientePage() {
  await requireRole("client");
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <SignOutButton />
      </div>
      <ComingSoon title="Mi perfil" step="Editar datos y avatar — Step 14" />
    </div>
  );
}
