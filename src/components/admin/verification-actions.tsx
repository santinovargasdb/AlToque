"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveProvider, rejectProvider } from "@/lib/actions/admin";

export function VerificationActions({ providerId }: { providerId: string }) {
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  function approve() {
    startTransition(async () => {
      const res = await approveProvider(providerId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Profesional aprobado y notificado.");
    });
  }

  function confirmReject() {
    startTransition(async () => {
      const res = await rejectProvider(providerId, reason);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Verificación rechazada; el profesional ya tiene el motivo.");
      setRejecting(false);
      setReason("");
    });
  }

  if (rejecting) {
    return (
      <div className="w-full max-w-sm space-y-2">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo del rechazo (lo ve el profesional), ej: la foto del frente del DNI está borrosa."
          rows={3}
          maxLength={500}
          className="w-full rounded-lg border border-input bg-background p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          autoFocus
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            disabled={pending || reason.trim().length < 5}
            onClick={confirmReject}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
            Confirmar rechazo
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => setRejecting(false)}
          >
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="success" disabled={pending} onClick={approve}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        Aprobar
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() => setRejecting(true)}
      >
        <X className="size-4" />
        Rechazar
      </Button>
    </div>
  );
}
