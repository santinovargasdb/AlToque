"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportFields } from "@/components/shared/report-fields";
import { createJobReport } from "@/lib/actions/report";
import type { ReportReason } from "@/lib/validations/report";

/** Reportar un problema con el trabajo. Lo ve solo el equipo de AlToque. */
export function ReportJobForm({
  jobId,
  alreadyReported,
}: {
  jobId: string;
  alreadyReported: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | "">("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  if (alreadyReported) {
    return (
      <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        Ya reportaste este trabajo. Lo está revisando el equipo de AlToque.
      </p>
    );
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Flag className="size-4" />
        Reportar un problema
      </Button>
    );
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createJobReport({ jobId, reason, description });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Recibimos tu reporte. Lo vamos a revisar.");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-md border border-border bg-card p-4"
    >
      <h2 className="font-heading font-semibold">Reportar un problema</h2>
      <ReportFields
        reason={reason}
        description={description}
        onReasonChange={setReason}
        onDescriptionChange={setDescription}
      />
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Enviar reporte
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
