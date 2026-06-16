import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { ClipboardList, ChevronRight } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { jobs, profiles, categories } from "@/lib/db/schema";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import type { JobStatus } from "@/types";

const STATUS: Record<JobStatus, { label: string; variant: BadgeProps["variant"] }> = {
  requested: { label: "Solicitado", variant: "warning" },
  broadcasting: { label: "Buscando", variant: "warning" },
  accepted: { label: "Aceptado", variant: "default" },
  in_progress: { label: "En curso", variant: "default" },
  completed: { label: "Completado", variant: "success" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  expired: { label: "Vencido", variant: "secondary" },
};

export default async function ClientPedidosPage() {
  const { user } = await requireRole("client");

  const list = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      status: jobs.status,
      type: jobs.type,
      scheduledAt: jobs.scheduledAt,
      createdAt: jobs.createdAt,
      categoryName: categories.name,
      providerName: profiles.fullName,
    })
    .from(jobs)
    .innerJoin(categories, eq(categories.id, jobs.categoryId))
    .leftJoin(profiles, eq(profiles.id, jobs.providerId))
    .where(eq(jobs.clientId, user.id))
    .orderBy(desc(jobs.createdAt));

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-2xl font-bold">Mis pedidos</h1>

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <ClipboardList className="size-8" />
          <p>Todavía no hiciste ningún pedido.</p>
          <Button asChild size="sm" className="mt-2">
            <Link href="/inicio">Buscar un profesional</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((j) => {
            const s = STATUS[j.status];
            return (
              <li key={j.id}>
                <Link
                  href={`/pedido/${j.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)] hover:border-primary/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{j.title}</span>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {j.categoryName}
                      {j.providerName ? ` · ${j.providerName}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {j.type === "urgent"
                        ? "Urgente"
                        : j.scheduledAt
                          ? formatDateTime(j.scheduledAt)
                          : formatDateTime(j.createdAt)}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
