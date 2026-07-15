import type { Metadata } from "next";
import { desc, eq, sql } from "drizzle-orm";
import { Banknote, CreditCard, TrendingUp, AlertTriangle } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { commissionLedger, jobs } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { formatARS, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Cobros" };

const LEDGER_STATUS_LABEL = {
  collected: "Comisión retenida",
  owed: "Comisión pendiente",
  settled: "Comisión saldada",
} as const;

/** Ganancias del profesional: totales + detalle por trabajo (Step 9b). */
export default async function ProCobrosPage() {
  const { user } = await requireRole("provider");

  const [entries, [totals]] = await Promise.all([
    db
      .select({
        id: commissionLedger.id,
        amount: commissionLedger.amount,
        source: commissionLedger.source,
        status: commissionLedger.status,
        createdAt: commissionLedger.createdAt,
        jobTitle: jobs.title,
        finalPrice: jobs.finalPrice,
        paymentMethod: jobs.paymentMethod,
      })
      .from(commissionLedger)
      .innerJoin(jobs, eq(jobs.id, commissionLedger.jobId))
      .where(eq(commissionLedger.providerId, user.id))
      .orderBy(desc(commissionLedger.createdAt))
      .limit(50),
    db
      .select({
        jobsCount: sql<number>`count(*)::int`,
        billed: sql<string>`coalesce(sum(${jobs.finalPrice}), 0)`,
        commission: sql<string>`coalesce(sum(${commissionLedger.amount}), 0)`,
        owed: sql<string>`coalesce(sum(${commissionLedger.amount}) filter (where ${commissionLedger.status} = 'owed'), 0)`,
      })
      .from(commissionLedger)
      .innerJoin(jobs, eq(jobs.id, commissionLedger.jobId))
      .where(eq(commissionLedger.providerId, user.id)),
  ]);

  const billed = Number(totals?.billed ?? 0);
  const commission = Number(totals?.commission ?? 0);
  const owed = Number(totals?.owed ?? 0);
  const net = billed - commission;

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-2xl font-bold">Cobros</h1>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Trabajos completados"
          value={String(totals?.jobsCount ?? 0)}
        />
        <StatCard label="Facturado" value={formatARS(billed)} />
        <StatCard
          label="Tu neto (menos comisión)"
          value={formatARS(net)}
          icon={<TrendingUp className="size-4 text-success" />}
        />
        <StatCard
          label="Debés a AlToque (efectivo)"
          value={formatARS(owed)}
          warning={owed > 0}
          icon={
            owed > 0 ? (
              <AlertTriangle className="size-4 text-warning" />
            ) : undefined
          }
        />
      </div>

      <section className="space-y-2">
        <h2 className="font-heading text-lg font-semibold">Detalle</h2>
        {entries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Cuando completes trabajos vas a ver acá tus cobros y comisiones.
          </p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li
                key={e.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.jobTitle}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {e.paymentMethod === "cash" ? (
                        <Banknote className="size-3.5" />
                      ) : (
                        <CreditCard className="size-3.5" />
                      )}
                      {formatDate(e.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading font-bold">
                      {formatARS(e.finalPrice ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Comisión {formatARS(e.amount)}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <Badge
                    variant={e.status === "owed" ? "warning" : "secondary"}
                  >
                    {LEDGER_STATUS_LABEL[e.status]}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  warning = false,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <div
      className={
        warning
          ? "rounded-xl border border-warning/40 bg-warning/5 p-4"
          : "rounded-xl border border-border bg-card p-4"
      }
    >
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 font-heading text-lg font-bold">{value}</p>
    </div>
  );
}
