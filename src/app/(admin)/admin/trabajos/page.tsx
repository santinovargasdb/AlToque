import { requireRole } from "@/lib/auth";
import { ComingSoon } from "@/components/shared/coming-soon";

export default async function AdminTrabajosPage() {
  await requireRole("admin");
  return <ComingSoon title="Trabajos" step="Step 12 del Build Order" />;
}
