import type { Metadata } from "next";
import { desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { jobReports, jobs, profiles } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { ReportActions } from "@/components/admin/report-actions";
import { formatDateTime } from "@/lib/utils";
import { REPORT_REASON_LABELS } from "@/lib/validations/report";

export const metadata: Metadata = { title: "Reportes" };

const STATUS_LABEL = {
  open: "Abierto",
  resolved: "Resuelto",
  dismissed: "Descartado",
} as const;
const STATUS_VARIANT = {
  open: "warning",
  resolved: "success",
  dismissed: "secondary",
} as const;

const reporter = alias(profiles, "reporter");
const target = alias(profiles, "target");

/** Reclamos sobre trabajos: primero los abiertos, y dentro de eso los más nuevos. */
export default async function AdminReportesPage() {
  await requireRole("admin");

  const rows = await db
    .select({
      id: jobReports.id,
      reason: jobReports.reason,
      description: jobReports.description,
      status: jobReports.status,
      adminNote: jobReports.adminNote,
      createdAt: jobReports.createdAt,
      targetId: jobReports.targetId,
      jobTitle: jobs.title,
      jobStatus: jobs.status,
      providerId: jobs.providerId,
      reporterName: reporter.fullName,
      reporterPhone: reporter.phone,
      targetName: target.fullName,
      targetPhone: target.phone,
    })
    .from(jobReports)
    .innerJoin(jobs, eq(jobs.id, jobReports.jobId))
    .innerJoin(reporter, eq(reporter.id, jobReports.reporterId))
    .innerJoin(target, eq(target.id, jobReports.targetId))
    .orderBy(
      sql`case when ${jobReports.status} = 'open' then 0 else 1 end`,
      desc(jobReports.createdAt),
    )
    .limit(200);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Reportes</h1>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Todavía no hay reportes.
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li
              key={r.id}
              className="space-y-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{REPORT_REASON_LABELS[r.reason]}</p>
                <Badge variant={STATUS_VARIANT[r.status]}>
                  {STATUS_LABEL[r.status]}
                </Badge>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm">
                {r.description}
              </p>
              <dl className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                <div>
                  <dt className="inline font-medium">Reporta: </dt>
                  <dd className="inline">
                    {r.reporterName ?? "Sin nombre"}
                    {r.reporterPhone && ` · ${r.reporterPhone}`}
                  </dd>
                </div>
                <div>
                  <dt className="inline font-medium">Reportado: </dt>
                  <dd className="inline">
                    {r.targetName ?? "Sin nombre"}
                    {r.targetPhone && ` · ${r.targetPhone}`}
                  </dd>
                </div>
                <div>
                  <dt className="inline font-medium">Pedido: </dt>
                  <dd className="inline">
                    {r.jobTitle} ({r.jobStatus})
                  </dd>
                </div>
                <div>
                  <dt className="inline font-medium">Fecha: </dt>
                  <dd className="inline">{formatDateTime(r.createdAt)}</dd>
                </div>
              </dl>
              {r.adminNote && (
                <p className="rounded-md bg-muted/40 p-3 text-sm">
                  <span className="font-medium">Nota: </span>
                  {r.adminNote}
                </p>
              )}
              {r.status === "open" && (
                <ReportActions
                  reportId={r.id}
                  canSuspend={r.targetId === r.providerId}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
