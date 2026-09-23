"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
          {pending ? (
            <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          Aceptar
        </Button>
        <Button
          variant="outline"
          className="text-destructive"
          onClick={() => move("cancelled")}
          disabled={pending}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" x2="9" y1="9" y2="15" />
            <line x1="9" x2="15" y1="9" y2="15" />
          </svg>
          Rechazar
        </Button>
      </div>
    );
  }

  if (status === "accepted") {
    return (
      <Button className="w-full" onClick={() => move("in_progress")} disabled={pending}>
        {pending ? (
          <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}
        Iniciar trabajo
      </Button>
    );
  }

  if (status === "in_progress") {
    return (
      <div className="space-y-3 rounded-md border border-border bg-card p-4">
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
        </div>
        <Button className="w-full" onClick={finish} disabled={pending}>
          {pending && (
            <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          Marcar como completado
        </Button>
      </div>
    );
  }

  return null;
}
