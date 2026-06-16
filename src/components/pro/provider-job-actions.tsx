"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Check, Play, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatARS } from "@/lib/utils";
import { updateJobStatus, completeJob } from "@/lib/actions/job";
import type { JobStatus } from "@/types";

/** Acciones del profesional sobre un pedido según su estado. */
export function ProviderJobActions({
  jobId,
  status,
}: {
  jobId: string;
  status: JobStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [price, setPrice] = useState("");

  function move(target: "accepted" | "in_progress" | "cancelled") {
    startTransition(async () => {
      const res = await updateJobStatus({ jobId, status: target });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        target === "accepted"
          ? "Pedido aceptado."
          : target === "in_progress"
            ? "Trabajo iniciado."
            : "Pedido rechazado.",
      );
    });
  }

  function finish() {
    const value = Number(price);
    if (!Number.isFinite(value) || value <= 0) {
      return toast.error("Ingresá el precio final.");
    }
    startTransition(async () => {
      const res = await completeJob({ jobId, finalPrice: value });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("¡Trabajo completado!");
    });
  }

  if (status === "requested") {
    return (
      <div className="flex gap-2">
        <Button
          variant="success"
          className="flex-1"
          onClick={() => move("accepted")}
          disabled={pending}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Aceptar
        </Button>
        <Button
          variant="outline"
          className="text-destructive"
          onClick={() => move("cancelled")}
          disabled={pending}
        >
          <XCircle className="size-4" /> Rechazar
        </Button>
      </div>
    );
  }

  if (status === "accepted") {
    return (
      <Button className="w-full" onClick={() => move("in_progress")} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
        Iniciar trabajo
      </Button>
    );
  }

  if (status === "in_progress") {
    const value = Number(price);
    const commission = Number.isFinite(value) && value > 0 ? value * 0.12 : 0;
    return (
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label htmlFor="price">Precio final del trabajo</Label>
          <Input
            id="price"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="Ej: 15000"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          {commission > 0 && (
            <p className="text-xs text-muted-foreground">
              Comisión estimada: {formatARS(commission)} · Recibís{" "}
              {formatARS(value - commission)}
            </p>
          )}
        </div>
        <Button className="w-full" onClick={finish} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Marcar como completado
        </Button>
      </div>
    );
  }

  return null;
}
