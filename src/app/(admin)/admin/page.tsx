import { eq, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { jobs, providerProfiles, commissionLedger } from "@/lib/db/schema";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { formatARS } from "@/lib/utils";

export default async function AdminPage() {
  await requireRole("admin");

  const [[providersRow], [jobsRow], [ledgerRow]] = await Promise.all([
    db
      .select({ verified: sql<number>`count(*)::int` })
      .from(providerProfiles)
      .where(eq(providerProfiles.verificationStatus, "approved")),
    db
      .select({
        completed: sql<number>`count(*) filter (where ${jobs.status} = 'completed')::int`,
        gmv: sql<string>`coalesce(sum(${jobs.finalPrice}) filter (where ${jobs.status} = 'completed'), 0)`,
      })
      .from(jobs),
    db
      .select({
        collected: sql<string>`coalesce(sum(${commissionLedger.amount}) filter (where ${commissionLedger.status} in ('collected','settled')), 0)`,
      })
      .from(commissionLedger),
  ]);

  const KPIS = [
    {
      label: "Profesionales verificados",
      value: String(providersRow?.verified ?? 0),
    },
    { label: "Pedidos completados", value: String(jobsRow?.completed ?? 0) },
    { label: "GMV (volumen)", value: formatARS(Number(jobsRow?.gmv ?? 0)) },
    {
      label: "Comisión cobrada",
      value: formatARS(Number(ledgerRow?.collected ?? 0)),
    },
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
    </div>
  );
}
