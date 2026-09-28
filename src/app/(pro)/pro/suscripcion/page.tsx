import { eq, and, ne, count } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions, providerProfiles } from "@/lib/db/schema";
import {
  ProviderSubscribeButton,
  CancelButton,
  ResumeButton,
} from "./subscribe-button";

const FOUNDING_THRESHOLD = 50;
const PROVIDER_REGULAR_PRICE = 7000;
const PROVIDER_FOUNDING_PRICE = 5000;

const BENEFITS = [
  "Pedidos ilimitados de clientes verificados",
  "Perfil con badge de profesional activo",
  "Agenda digital integrada en la app",
  "Estadísticas de trabajos y calificaciones",
  "Soporte directo en disputas",
  "Reseñas verificadas y portables",
];

type SubStatus = "pending" | "active" | "past_due" | "paused" | "cancelled";

type SubRecord = {
  status: SubStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

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

export default async function ProSuscripcionPage() {
  const session = await requireRole("provider");
  const uid = session.user.id;

  const [subRows, ppRows, activeCountRows] = await Promise.all([
    db
      .select({
        status: subscriptions.status,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.profileId, uid),
          eq(subscriptions.plan, "provider_monthly"),
        ),
      )
      .limit(1),

    db
      .select({ jobsCompleted: providerProfiles.jobsCompleted })
      .from(providerProfiles)
      .where(eq(providerProfiles.profileId, uid))
      .limit(1),

    db
      .select({ n: count() })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.plan, "provider_monthly"),
          ne(subscriptions.status, "cancelled"),
        ),
      ),
  ]);

  const sub = (subRows[0] as SubRecord | undefined) ?? null;
  const jobsDone = ppRows[0]?.jobsCompleted ?? 0;
  const activeCount = Number(activeCountRows[0]?.n ?? 0);
  const isFounding = activeCount < FOUNDING_THRESHOLD;
  const price = isFounding ? PROVIDER_FOUNDING_PRICE : PROVIDER_REGULAR_PRICE;
  const freeJobsLeft = Math.max(0, 5 - jobsDone);
  const isSubscribed = sub !== null && sub.status !== "cancelled";

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-16">
      <header>
        <h1 className="font-heading text-2xl font-bold">Suscripción AlToque Pro</h1>
        <p className="mt-1 text-muted-foreground">
          Accedé sin límites a todos los pedidos de la plataforma.
        </p>
      </header>

      {isSubscribed ? (
        <ActiveSubscriptionCard sub={sub} price={price} isFounding={isFounding} />
      ) : (
        <>
          {/* Progreso de trabajos gratis */}
          {freeJobsLeft > 0 && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-primary">
                  Trabajos de bienvenida
                </span>
                <span className="font-heading text-sm font-bold text-primary">
                  {jobsDone} / 5
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-primary/15">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, (jobsDone / 5) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {freeJobsLeft === 1
                  ? "Te queda 1 trabajo gratuito antes de necesitar la suscripción."
                  : `Te quedan ${freeJobsLeft} trabajos gratuitos.`}
              </p>
            </div>
          )}

          {jobsDone >= 5 && (
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
              <p className="text-sm font-semibold text-accent">
                Completaste tus 5 trabajos de bienvenida
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Activá tu suscripción para seguir recibiendo pedidos.
              </p>
            </div>
          )}

          <PlanCard
            price={price}
            regularPrice={PROVIDER_REGULAR_PRICE}
            isFounding={isFounding}
            foundingLeft={Math.max(0, FOUNDING_THRESHOLD - activeCount)}
          />

          <ProviderSubscribeButton isFounding={isFounding} />

          <p className="text-center text-xs text-muted-foreground">
            Cancelá cuando quieras · Sin permanencia · Débito procesado por Mercado Pago
          </p>
        </>
      )}

      {sub?.status === "cancelled" && (
        <>
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            Tu suscripción fue cancelada. Podés volver a activarla cuando quieras.
          </div>
          <PlanCard
            price={price}
            regularPrice={PROVIDER_REGULAR_PRICE}
            isFounding={isFounding}
            foundingLeft={Math.max(0, FOUNDING_THRESHOLD - activeCount)}
          />
          <ProviderSubscribeButton isFounding={isFounding} />
        </>
      )}
    </div>
  );
}

function PlanCard({
  price,
  regularPrice,
  isFounding,
  foundingLeft,
}: {
  price: number;
  regularPrice: number;
  isFounding: boolean;
  foundingLeft: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      {isFounding && (
        <div className="bg-accent px-4 py-2.5 text-center">
          <span className="text-xs font-semibold text-white">
            PRECIO FUNDADOR · {foundingLeft} lugar{foundingLeft !== 1 ? "es" : ""} disponible{foundingLeft !== 1 ? "s" : ""}
          </span>
        </div>
      )}
      <div className="p-6">
        <div className="mb-1 flex items-baseline gap-2">
          <span className="font-heading text-4xl font-bold text-foreground">
            {formatARS(price)}
          </span>
          <span className="text-muted-foreground">/mes</span>
        </div>
        {isFounding && price < regularPrice && (
          <p className="mb-5 text-xs text-muted-foreground">
            Precio regular:{" "}
            <span className="line-through">{formatARS(regularPrice)}</span>
            {" "}· Bloqueado de por vida mientras mantengas la suscripción activa
          </p>
        )}
        <ul className="space-y-3">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <svg viewBox="0 0 12 12" className="h-3 w-3 text-primary" fill="none">
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-foreground/80">{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ActiveSubscriptionCard({
  sub,
  price,
  isFounding,
}: {
  sub: SubRecord;
  price: number;
  isFounding: boolean;
}) {
  const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;

  if (sub.status === "pending") {
    return (
      <div className="rounded-xl border border-border bg-muted/40 p-6 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="h-5 w-5 animate-spin text-primary"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
        <p className="font-medium">Procesando tu suscripción…</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Si ya autorizaste el pago en Mercado Pago, la activación puede tardar unos minutos.
          Recargá la página para ver el estado actualizado.
        </p>
      </div>
    );
  }

  if (sub.status === "past_due") {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <p className="font-medium text-destructive">Pago pendiente</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu último débito no se pudo procesar. Mercado Pago reintentará automáticamente.
          Verificá el método de pago en tu cuenta de MP.
        </p>
      </div>
    );
  }

  if (sub.status === "paused") {
    return (
      <div className="rounded-xl border border-border bg-muted/40 p-5">
        <p className="font-medium">Suscripción pausada</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu suscripción está pausada temporalmente por Mercado Pago.
        </p>
      </div>
    );
  }

  // active
  return (
    <div className="overflow-hidden rounded-2xl border border-primary/20 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-border bg-primary/5 px-5 py-3">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
          <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none">
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="text-sm font-semibold text-primary">Suscripción activa</span>
        {isFounding && (
          <span className="ml-auto rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
            Precio fundador
          </span>
        )}
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-baseline gap-2">
          <span className="font-heading text-3xl font-bold">{formatARS(price)}</span>
          <span className="text-muted-foreground">/mes</span>
        </div>
        {periodEnd && (
          <p className="text-sm text-muted-foreground">
            {sub.cancelAtPeriodEnd
              ? `Activa hasta el ${formatDate(periodEnd)} · no se renovará`
              : `Próximo débito: ${formatDate(periodEnd)}`}
          </p>
        )}
        <div className="border-t border-border pt-4">
          {sub.cancelAtPeriodEnd ? <ResumeButton /> : <CancelButton />}
        </div>
      </div>
    </div>
  );
}
