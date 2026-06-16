import { requireRole } from "@/lib/auth";
import { ComingSoon } from "@/components/shared/coming-soon";

export default async function ProCobrosPage() {
  await requireRole("provider");
  return (
    <ComingSoon
      title="Cobros"
      step="Conectar Mercado Pago + ganancias — Step 9"
    />
  );
}
