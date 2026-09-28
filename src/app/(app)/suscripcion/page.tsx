import { eq, and } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import {
  ClientSubscribeButton,
  ClientCancelButton,
  ClientResumeButton,
} from "./subscribe-button";

const CLIENT_PRICE = 4500;

type SubStatus = "pending" | "active" | "past_due" | "paused" | "cancelled";

const FREE_FEATURES = [
  "Buscar profesionales verificados",
  "Ver perfiles, reseñas y calificaciones",
  "Pedidos agendados sin límite",
  "Chat durante el trabajo activo",
];

const PREMIUM_FEATURES = [
  "Todo lo incluido en el plan gratuito",
  "Pedidos urgentes, no solo agendados",
  "Despacho en tiempo real a los profesionales cercanos disponibles",
  "Aviso al instante cuando un profesional acepta tu urgencia",
];

function formatDate(d: Date) {
  return d.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function SuscripcionPage() {
  const session = await requireRole("client");
  const uid = session.user.id;

  const subRows = await db
    .select({
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.profileId, uid),
        eq(subscriptions.plan, "client_monthly"),
      ),
    )
    .limit(1);

  const sub = subRows[0] as
    | { status: SubStatus; currentPeriodEnd: Date | null; cancelAtPeriodEnd: boolean }
    | undefined;

  const isActive = sub?.status === "active";
  const isPending = sub?.status === "pending";
  const periodEnd = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-16">
      <header>
        <h1 className="font-heading text-2xl font-bold">AlToque Premium</h1>
        <p className="mt-1 text-muted-foreground">
          Para consorcios, landlords y quienes no pueden esperar.
        </p>
      </header>

      {/* Estado activo */}
      {isActive && (
        <div className="overflow-hidden rounded-2xl border border-primary/20 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-border bg-primary/5 px-5 py-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
              <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-sm font-semibold text-primary">Premium activo</span>
          </div>
          <div className="space-y-4 p-5">
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-3xl font-bold">{formatARS(CLIENT_PRICE)}</span>
              <span className="text-muted-foreground">/mes</span>
            </div>
            {periodEnd && (
              <p className="text-sm text-muted-foreground">
                {sub?.cancelAtPeriodEnd
                  ? `Activo hasta el ${formatDate(periodEnd)} · no se renovará`
                  : `Próximo débito: ${formatDate(periodEnd)}`}
              </p>
            )}
            <div className="border-t border-border pt-4">
              {sub?.cancelAtPeriodEnd ? <ClientResumeButton /> : <ClientCancelButton />}
            </div>
          </div>
        </div>
      )}

      {/* Procesando */}
      {isPending && (
        <div className="rounded-xl border border-border bg-muted/40 p-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-5 w-5 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="font-medium">Procesando tu suscripción…</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Si ya autorizaste el pago, la activación puede tardar unos minutos.
          </p>
        </div>
      )}

      {/* Planes: comparación */}
      {!isActive && !isPending && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Gratuito */}
            <div className="rounded-2xl border border-border bg-white p-5">
              <div className="mb-4">
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Gratuito
                </span>
                <p className="mt-3 font-heading text-2xl font-bold">Gratis</p>
                <p className="text-sm text-muted-foreground">Para uso ocasional</p>
              </div>
              <ul className="space-y-2.5">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/75">
                    <svg viewBox="0 0 12 12" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Premium */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-primary bg-white p-5 shadow-md">
              <div className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">
                Recomendado
              </div>
              <div className="mb-4">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  Premium
                </span>
                <div className="mt-3 flex items-baseline gap-1">
                  <p className="font-heading text-2xl font-bold">{formatARS(CLIENT_PRICE)}</p>
                  <span className="text-sm text-muted-foreground">/mes</span>
                </div>
                <p className="text-sm text-muted-foreground">Para consorcios y propietarios</p>
              </div>
              <ul className="space-y-2.5">
                {PREMIUM_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <svg viewBox="0 0 12 12" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-foreground/80">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <ClientSubscribeButton />

          <p className="text-center text-xs text-muted-foreground">
            Cancelá cuando quieras · Sin permanencia · Débito procesado por Mercado Pago
          </p>
        </>
      )}
    </div>
  );
}
