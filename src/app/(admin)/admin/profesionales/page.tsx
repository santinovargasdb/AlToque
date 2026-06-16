import { requireRole } from "@/lib/auth";
import { ComingSoon } from "@/components/shared/coming-soon";

export default async function AdminProfesionalesPage() {
  await requireRole("admin");
  return <ComingSoon title="Profesionales" step="Step 12 del Build Order" />;
}
