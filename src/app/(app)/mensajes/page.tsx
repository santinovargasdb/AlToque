import { requireRole } from "@/lib/auth";
import { ComingSoon } from "@/components/shared/coming-soon";

export default async function MensajesPage() {
  await requireRole("client");
  return <ComingSoon title="Mensajes" step="Chat en tiempo real — Step 11" />;
}
