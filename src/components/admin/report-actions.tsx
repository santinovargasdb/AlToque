"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  resolveReport,
  suspendReportedProvider,
} from "@/lib/actions/report";

/** Acciones del admin sobre un reporte abierto. Todas exigen una nota. */
export function ReportActions({
  reportId,
  canSuspend,
}: {
  reportId: string;
  canSuspend: boolean;
}) {
  const [note, setNote] = useState("");
  const [confirmingSuspend, setConfirmingSuspend] = useState(false);
  const [pending, startTransition] = useTransition();
  const noteId = `report-note-${reportId}`;

  function close(outcome: "resolved" | "dismissed") {
    startTransition(async () => {
      const res = await resolveReport({ reportId, note }, outcome);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        outcome === "resolved" ? "Reporte resuelto." : "Reporte descartado.",
      );
    });
  }

  function suspend() {
    startTransition(async () => {
      const res = await suspendReportedProvider({ reportId, note });
      if (!res.ok) {
        toast.error(res.error);
        setConfirmingSuspend(false);
        return;
      }
      if (res.warning) toast.warning(res.warning, { duration: 15000 });
      else toast.success("Profesional suspendido y avisado.");
    });
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="space-y-1.5">
        <Label htmlFor={noteId}>Nota</Label>
        <Textarea
          id={noteId}
          rows={2}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Qué se decidió y por qué. Si suspendés, es el motivo que ve el profesional."
        />
      </div>
      {confirmingSuspend ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            ¿Suspender a este profesional? Deja de aparecer y de recibir pedidos,
            y se pausa su suscripción.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" onClick={suspend} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Sí, suspender
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmingSuspend(false)}
              disabled={pending}
            >
              Volver
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => close("resolved")} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Resolver
          </Button>
          <Button
            variant="outline"
            onClick={() => close("dismissed")}
            disabled={pending}
          >
            Descartar
          </Button>
          {canSuspend && (
            <Button
              variant="outline"
              className="text-destructive"
              onClick={() => setConfirmingSuspend(true)}
              disabled={pending}
            >
              Suspender profesional
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
