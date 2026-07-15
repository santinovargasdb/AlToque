import type { Metadata } from "next";
import { desc, eq, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { commissionLedger, jobs, profiles } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { SettleCommissionButton } from "@/components/admin/settle-commission-button";
import { formatARS, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Comisiones" };

const SOURCE_LABEL = { split: "Pago por la app", cash_debt: "Efectivo" } as const;
const STATUS_LABEL = {
  collected: "Cobrada",
  owed: "Adeudada",
  settled: "Saldada",
} as const;
const STATUS_VARIANT = {
  collected: "success",
  owed: "warning",
  settled: "secondary",
} as const;

/** Ledger de comisiones: cobrado (split) vs adeudado (efectivo) + saldar. */
export default async function AdminComisionesPage() {
  await requireRole("admin");

  const [entries, [totals]] = await Promise.all([
    db
      .select({
        id: commissionLedger.id,
        amount: commissionLedger.amount,
        source: commissionLedger.source,
        status: commissionLedger.status,
        createdAt: commissionLedger.createdAt,
        jobTitle: jobs.title,
        providerName: profiles.fullName,
      })
      .from(commissionLedger)
      .innerJoin(jobs, eq(jobs.id, commissionLedger.jobId))
      .innerJoin(profiles, eq(profiles.id, commissionLedger.providerId))
      .orderBy(desc(commissionLedger.createdAt))
      .limit(100),
    db
      .select({
        collected: sql<string>`coalesce(sum(${commissionLedger.amount}) filter (where ${commissionLedger.status} = 'collected'), 0)`,
        owed: sql<string>`coalesce(sum(${commissionLedger.amount}) filter (where ${commissionLedger.status} = 'owed'), 0)`,
        settled: sql<string>`coalesce(sum(${commissionLedger.amount}) filter (where ${commissionLedger.status} = 'settled'), 0)`,
      })
      .from(commissionLedger),
  ]);

  const cards = [
    { label: "Cobrada (escrow)", value: Number(totals?.collected ?? 0) },
    { label: "Adeudada (efectivo)", value: Number(totals?.owed ?? 0) },
    { label: "Saldada", value: Number(totals?.settled ?? 0) },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Comisiones</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-border bg-card p-5"
          >
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="mt-1 font-heading text-2xl font-bold">
              {formatARS(c.value)}
            </p>
          </div>
        ))}
      </div>

      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Todavía no hay comisiones registradas.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Profesional</th>
                <th className="px-4 py-3">Trabajo</th>
                <th className="px-4 py-3">Origen</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDate(e.createdAt)}
                  </td>
                  <td className="px-4 py-3">{e.providerName ?? "—"}</td>
                  <td className="max-w-48 truncate px-4 py-3">{e.jobTitle}</td>
                  <td className="px-4 py-3">{SOURCE_LABEL[e.source]}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatARS(e.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[e.status]}>
                      {STATUS_LABEL[e.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {e.status === "owed" && (
                      <SettleCommissionButton ledgerId={e.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
