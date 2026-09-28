import Link from "next/link";
import { asc } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { hasActiveClientSubscription } from "@/lib/subscriptions/status";
import { NewOrderWizard } from "@/components/app/new-order-wizard";

export default async function PedidoUrgentePage() {
  const { user } = await requireRole("client");

  const isPremium = await hasActiveClientSubscription(user.id);

  if (!isPremium) {
    return <UrgentUpsell />;
  }

  const cats = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Necesito ayuda ahora</h1>
        <p className="text-muted-foreground">
          Buscamos el profesional disponible más cercano y te conectamos al
          instante.
        </p>
      </div>
      <NewOrderWizard userId={user.id} mode="broadcast" categories={cats} canUrgent />
    </div>
  );
}

const PREMIUM_POINTS = [
  "Despacho en tiempo real al profesional disponible más cercano",
  "Aviso al instante cuando alguien acepta tu urgencia",
  "Todo lo del plan gratuito, sin límites",
];

function UrgentUpsell() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="flex flex-col items-center text-center">
        <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="size-7"
          >
            <path d="M10 2.5 11.8 7.6 17.1 7.7 12.9 10.9 14.4 16.1 10 13 5.6 16.1 7.1 10.9 2.9 7.7 8.2 7.6Z" />
          </svg>
        </span>
        <h1 className="font-heading text-2xl font-bold">
          Las urgencias son de AlToque Premium
        </h1>
        <p className="mt-2 text-muted-foreground">
          El despacho urgente conecta tu pedido, en el momento, con los
          profesionales disponibles más cercanos. Es la ventaja de Premium.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <ul className="space-y-3">
          {PREMIUM_POINTS.map((point) => (
            <li key={point} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <svg viewBox="0 0 12 12" className="size-3 text-primary" fill="none">
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-foreground/80">{point}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <Link
          href="/suscripcion"
          className="flex w-full items-center justify-center rounded-xl bg-primary px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-primary/90 active:scale-[0.98]"
        >
          Ver AlToque Premium
        </Link>
        <Link
          href="/inicio"
          className="flex w-full items-center justify-center rounded-xl border border-border px-6 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
        >
          Agendar un trabajo (gratis)
        </Link>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Los trabajos agendados con un profesional siguen siendo gratuitos y sin
        límite.
      </p>
    </div>
  );
}
