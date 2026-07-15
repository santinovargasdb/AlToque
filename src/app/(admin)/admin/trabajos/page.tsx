import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { jobs, profiles, categories } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { formatARS, formatDate } from "@/lib/utils";
import type { JobStatus } from "@/types";

export const metadata: Metadata = { title: "Trabajos" };

const STATUS_LABEL: Record<JobStatus, string> = {
  requested: "Solicitado",
  broadcasting: "Buscando",
  accepted: "Aceptado",
  in_progress: "En curso",
  completed: "Completado",
  cancelled: "Cancelado",
  expired: "Vencido",
};

const STATUS_VARIANT: Record<
  JobStatus,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  requested: "secondary",
  broadcasting: "warning",
  accepted: "default",
  in_progress: "default",
  completed: "success",
  cancelled: "destructive",
  expired: "secondary",
};

/** Vista global de pedidos para el admin (Step 12). */
export default async function AdminTrabajosPage() {
  await requireRole("admin");

  const client = alias(profiles, "client");
  const provider = alias(profiles, "provider");

  const rows = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      status: jobs.status,
      type: jobs.type,
      paymentMethod: jobs.paymentMethod,
      paymentStatus: jobs.paymentStatus,
      finalPrice: jobs.finalPrice,
      createdAt: jobs.createdAt,
      categoryName: categories.name,
      clientName: client.fullName,
      providerName: provider.fullName,
    })
    .from(jobs)
    .innerJoin(categories, eq(categories.id, jobs.categoryId))
    .innerJoin(client, eq(client.id, jobs.clientId))
    .leftJoin(provider, eq(provider.id, jobs.providerId))
    .orderBy(desc(jobs.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Trabajos</h1>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Todavía no hay pedidos.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Trabajo</th>
                <th className="px-4 py-3">Oficio</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Profesional</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Precio</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((j) => (
                <tr key={j.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDate(j.createdAt)}
                  </td>
                  <td className="max-w-48 truncate px-4 py-3 font-medium">
                    {j.title}
                    {j.type === "urgent" && (
                      <span className="ml-1.5 text-xs text-action">urgente</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{j.categoryName}</td>
                  <td className="px-4 py-3">{j.clientName ?? "—"}</td>
                  <td className="px-4 py-3">{j.providerName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[j.status]}>
                      {STATUS_LABEL[j.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {j.finalPrice ? formatARS(j.finalPrice) : "—"}
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
