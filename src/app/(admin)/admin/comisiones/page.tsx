import { requireRole } from "@/lib/auth";
import { ComingSoon } from "@/components/shared/coming-soon";

export default async function AdminComisionesPage() {
  await requireRole("admin");
  return (
    <ComingSoon
      title="Comisiones"
      step="Ledger cobrado vs adeudado — Step 12"
    />
  );
}
