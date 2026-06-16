import { requireRole } from "@/lib/auth";
import { SignOutButton } from "@/components/shared/sign-out-button";

export default async function AdminPage() {
  await requireRole("admin");

  const KPIS = [
    { label: "Profesionales verificados", value: "—" },
    { label: "Pedidos completados", value: "—" },
    { label: "GMV (volumen)", value: "—" },
    { label: "Comisión cobrada", value: "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Panel de control</h1>
        <SignOutButton />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-border bg-card p-5 shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
          >
            <p className="text-sm text-muted-foreground">{k.label}</p>
            <p className="mt-1 font-heading text-2xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Métricas, cola de verificaciones y ledger de comisiones — Step 12 del
        Build Order.
      </p>
    </div>
  );
}
