"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateJobStatus } from "@/lib/actions/job";
import type { JobStatus } from "@/types";

/** Acciones del cliente sobre su pedido (Step 6: cancelar). */
export function ClientJobActions({
  jobId,
  status,
}: {
  jobId: string;
  status: JobStatus;
}) {
  const [pending, startTransition] = useTransition();

  const cancelable = ["requested", "accepted", "in_progress"].includes(status);
  if (!cancelable) return null;

  function cancel() {
    startTransition(async () => {
      const res = await updateJobStatus({ jobId, status: "cancelled" });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Pedido cancelado.");
    });
  }

  return (
    <Button
      variant="outline"
      className="w-full text-destructive"
      onClick={cancel}
      disabled={pending}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
      Cancelar pedido
    </Button>
  );
}
