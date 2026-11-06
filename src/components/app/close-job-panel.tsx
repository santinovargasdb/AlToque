"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportFields } from "@/components/shared/report-fields";
import { closeJobAsClient } from "@/lib/actions/job-close";
import type { ReportReason } from "@/lib/validations/report";

type Step = "closed" | "choose" | "not_done";

/** El cliente cierra un trabajo aceptado o en curso: se hizo o no se hizo. */
export function CloseJobPanel({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("closed");
  const [reason, setReason] = useState<ReportReason | "">("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  function close(input: Parameters<typeof closeJobAsClient>[0], message: string) {
    startTransition(async () => {
      const res = await closeJobAsClient(input);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(message);
      router.refresh();
    });
  }

  if (step === "closed") {
    return (
      <Button className="w-full" onClick={() => setStep("choose")}>
        Cerrar trabajo
      </Button>
    );
  }

  if (step === "choose") {
    return (
      <section className="space-y-3 rounded-md border border-border bg-card p-4">
        <h2 className="font-heading font-semibold">¿Cómo terminó el trabajo?</h2>
        <Button
          variant="success"
          className="w-full"
          disabled={pending}
          onClick={() =>
            close(
              { jobId, outcome: "done" },
              "Trabajo cerrado. Ya podés dejar tu reseña.",
            )
          }
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          Se hizo
        </Button>
        <Button
          variant="outline"
          className="w-full"
          disabled={pending}
          onClick={() => setStep("not_done")}
        >
          <TriangleAlert className="size-4" />
          No se hizo o hubo un problema
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          disabled={pending}
          onClick={() => setStep("closed")}
        >
          Volver
        </Button>
      </section>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        close(
          { jobId, outcome: "not_done", reason, description },
          "Recibimos tu reporte. Ya podés dejar tu reseña.",
        );
      }}
      className="space-y-4 rounded-md border border-border bg-card p-4"
    >
      <h2 className="font-heading font-semibold">Contanos qué pasó</h2>
      <p className="text-sm text-muted-foreground">
        El pedido se cancela y el equipo de AlToque revisa el caso.
      </p>
      <ReportFields
        reason={reason}
        description={description}
        onReasonChange={setReason}
        onDescriptionChange={setDescription}
      />
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Cerrar y reportar
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => setStep("choose")}
        >
          Volver
        </Button>
      </div>
    </form>
  );
}
