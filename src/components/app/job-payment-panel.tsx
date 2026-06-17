"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CreditCard, ShieldCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PaymentMethod, PaymentStatus } from "@/types";

/**
 * Estado de pago del pedido para el cliente. Para pagos transfer/card:
 *  - 'pending'  → botón "Pagar" que reabre el Checkout (reconstruido del preferenceId).
 *  - 'held'     → "Pago retenido".
 *  - 'refunded' → "Reintegrado".
 * Muestra un toast según el back-url (?pago=success|failure|pending).
 */
export function JobPaymentPanel({
  paymentMethod,
  paymentStatus,
  mpPreferenceId,
}: {
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  mpPreferenceId: string | null;
}) {
  const params = useSearchParams();
  const pago = params.get("pago");

  useEffect(() => {
    if (pago === "success")
      toast.success("Recibimos tu pago. Queda retenido hasta completar el trabajo.");
    else if (pago === "failure") toast.error("El pago no se completó. Probá de nuevo.");
    else if (pago === "pending") toast.info("Tu pago está pendiente de acreditación.");
  }, [pago]);

  if (paymentMethod === "cash") {
    return (
      <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Pagás en efectivo, coordinás con el profesional.
      </p>
    );
  }

  if (paymentStatus === "held") {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 p-4 text-sm font-medium text-success">
        <ShieldCheck className="size-4" /> Pago retenido — protegido hasta completar el trabajo.
      </p>
    );
  }

  if (paymentStatus === "refunded") {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <RotateCcw className="size-4" /> Pago reintegrado.
      </p>
    );
  }

  if (paymentStatus === "pending" && mpPreferenceId) {
    const checkoutUrl = `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${mpPreferenceId}`;
    return (
      <Button asChild className="w-full">
        <a href={checkoutUrl}>
          <CreditCard className="size-4" /> Pagar con Mercado Pago
        </a>
      </Button>
    );
  }

  return null;
}
