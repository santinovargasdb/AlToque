import type { Metadata } from "next";
import { desc, eq, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions, profiles } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { formatARS, formatDate } from "@/lib/utils";
import {
  FOUNDING_THRESHOLD,
  PROVIDER_REGULAR_PRICE,
  PROVIDER_FOUNDING_PRICE,
  CLIENT_PRICE,
} from "@/lib/subscriptions/plans";

export const metadata: Metadata = { title: "Suscripciones" };

type SubPlan = "provider_monthly" | "client_monthly";
type SubStatus = "pending" | "active" | "past_due" | "paused" | "cancelled";

const PLAN_LABEL: Record<SubPlan, string> = {
  provider_monthly: "Profesional",
  client_monthly: "Cliente Premium",
};

const STATUS_LABEL: Record<SubStatus, string> = {
  pending: "Pendiente",
  active: "Activa",
  past_due: "En mora",
  paused: "Pausada",
  cancelled: "Cancelada",
};

const STATUS_VARIANT: Record<
  SubStatus,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  pending: "warning",
  active: "success",
  past_due: "destructive",
  paused: "secondary",
  cancelled: "secondary",
};

/**
 * Vista de suscripciones para el admin (reemplaza a comisiones; spec §8:
 * altas, bajas, ingreso recurrente y morosos). El MRR es una estimación:
 * la tabla no guarda el importe por fila (ver lib/subscriptions/plans.ts).
 */
export default async function AdminSuscripcionesPage() {
  await requireRole("admin");

  const [[agg], rows] = await Promise.all([
    db
      .select({
        activeProvider: sql<number>`count(*) filter (where ${subscriptions.plan} = 'provider_monthly' and ${subscriptions.status} = 'active')::int`,
        activeClient: sql<number>`count(*) filter (where ${subscriptions.plan} = 'client_monthly' and ${subscriptions.status} = 'active')::int`,
        pastDue: sql<number>`count(*) filter (where ${subscriptions.status} = 'past_due')::int`,
        pending: sql<number>`count(*) filter (where ${subscriptions.status} = 'pending')::int`,
      })
      .from(subscriptions),
    db
      .select({
        id: subscriptions.id,
        plan: subscriptions.plan,
        status: subscriptions.status,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        createdAt: subscriptions.createdAt,
        userName: profiles.fullName,
      })
      .from(subscriptions)
      .innerJoin(profiles, eq(profiles.id, subscriptions.profileId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(100),
  ]);

  const activeProvider = agg?.activeProvider ?? 0;
  const activeClient = agg?.activeClient ?? 0;

  // MRR estimado: los primeros FOUNDING_THRESHOLD activos pagan precio fundador.
  const foundingProviders = Math.min(activeProvider, FOUNDING_THRESHOLD);
  const regularProviders = Math.max(0, activeProvider - FOUNDING_THRESHOLD);
  const mrrEstimate =
    foundingProviders * PROVIDER_FOUNDING_PRICE +
    regularProviders * PROVIDER_REGULAR_PRICE +
    activeClient * CLIENT_PRICE;

  const KPIS = [
    { label: "MRR estimado", value: formatARS(mrrEstimate) },
    { label: "Profesionales activos", value: String(activeProvider) },
    { label: "Clientes Premium", value: String(activeClient) },
    { label: "En mora", value: String(agg?.pastDue ?? 0) },
    { label: "Pendientes", value: String(agg?.pending ?? 0) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Suscripciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          MRR estimado con el precio vigente de cada plan (la tabla no guarda el
          importe por suscripción).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Todavía no hay suscripciones.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Alta</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Renueva</th>
                <th className="px-4 py-3">Baja programada</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDate(s.createdAt)}
                  </td>
                  <td className="px-4 py-3">{s.userName ?? "s/d"}</td>
                  <td className="px-4 py-3">{PLAN_LABEL[s.plan]}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[s.status]}>
                      {STATUS_LABEL[s.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {s.currentPeriodEnd ? formatDate(s.currentPeriodEnd) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {s.cancelAtPeriodEnd ? (
                      <span className="text-warning">Sí</span>
                    ) : (
                      "—"
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
