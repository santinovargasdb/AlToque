"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  startProviderSubscription,
  cancelSubscriptionAtPeriodEnd,
  resumeSubscription,
} from "@/lib/actions/subscription";

export function ProviderSubscribeButton({ isFounding }: { isFounding: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubscribe() {
    startTransition(async () => {
      const result = await startProviderSubscription();
      if (result.ok) {
        router.push(result.initPoint);
      } else {
        alert(result.error);
      }
    });
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={pending}
      className="w-full rounded-xl bg-primary px-6 py-4 text-base font-semibold text-white transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Redirigiendo a Mercado Pago…
        </span>
      ) : (
        <>
          Suscribirme con Mercado Pago
          {isFounding && (
            <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
              Precio fundador
            </span>
          )}
        </>
      )}
    </button>
  );
}

export function CancelButton() {
  const [pending, startTransition] = useTransition();

  function handleCancel() {
    if (!confirm("¿Cancelar la suscripción al vencimiento del período actual?")) return;
    startTransition(async () => {
      await cancelSubscriptionAtPeriodEnd("provider_monthly");
    });
  }

  return (
    <button
      onClick={handleCancel}
      disabled={pending}
      className="text-sm text-muted-foreground underline-offset-4 hover:text-destructive hover:underline disabled:opacity-60"
    >
      {pending ? "Procesando…" : "Cancelar al vencimiento"}
    </button>
  );
}

export function ResumeButton() {
  const [pending, startTransition] = useTransition();

  function handleResume() {
    startTransition(async () => {
      await resumeSubscription("provider_monthly");
    });
  }

  return (
    <button
      onClick={handleResume}
      disabled={pending}
      className="text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-60"
    >
      {pending ? "Procesando…" : "Reactivar renovación automática"}
    </button>
  );
}
