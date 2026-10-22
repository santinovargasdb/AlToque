import Link from "next/link";
import { Sparkles, AlertTriangle, Lock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { ProviderGateState } from "@/lib/subscriptions/status";

/**
 * Aviso del estado de suscripción del profesional en `/pro/inicio` (spec §6):
 * trial de bienvenida, gracia por pago fallido, o bloqueo por trial agotado.
 * No muestra nada si el plan está al día.
 */
export function SubscriptionBanner({ state }: { state: ProviderGateState }) {
  if (state.kind === "active") return null;

  if (state.kind === "trial") {
    const n = state.freeJobsLeft;
    return (
      <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary-subtle p-4">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="flex-1 text-sm">
          <p className="font-medium text-foreground">
            Trial de bienvenida: te {n === 1 ? "queda" : "quedan"} {n}{" "}
            {n === 1 ? "trabajo" : "trabajos"} gratis
          </p>
          <p className="mt-0.5 text-muted-foreground">
            Después vas a necesitar una suscripción para seguir recibiendo
            pedidos.{" "}
            <Link
              href="/pro/suscripcion"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Ver planes
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (state.kind === "grace") {
    return (
      <div className="flex items-start gap-3 rounded-md border border-warning/40 bg-warning/10 p-4">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
        <div className="flex-1 text-sm">
          <p className="font-medium text-foreground">
            Tu último pago no se procesó
          </p>
          <p className="mt-0.5 text-muted-foreground">
            {state.until
              ? `Regularizá antes del ${formatDate(state.until)} para no dejar de recibir pedidos.`
              : "Regularizá tu suscripción para no dejar de recibir pedidos."}{" "}
            <Link
              href="/pro/suscripcion"
              className="font-medium text-warning underline-offset-2 hover:underline"
            >
              Actualizar pago
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // blocked
  return (
    <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-4">
      <Lock className="mt-0.5 size-5 shrink-0 text-destructive" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-foreground">
          No estás recibiendo pedidos nuevos
        </p>
        <p className="mt-0.5 text-muted-foreground">
          Se terminó tu período gratuito. Activá tu suscripción para volver a
          aparecer en las búsquedas.{" "}
          <Link
            href="/pro/suscripcion"
            className="font-medium text-destructive underline-offset-2 hover:underline"
          >
            Activar suscripción
          </Link>
        </p>
      </div>
    </div>
  );
}
