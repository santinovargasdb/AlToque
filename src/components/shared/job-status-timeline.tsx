import { Check, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobStatus } from "@/types";

const STEPS: { key: JobStatus; label: string }[] = [
  { key: "requested", label: "Solicitado" },
  { key: "accepted", label: "Aceptado" },
  { key: "in_progress", label: "En curso" },
  { key: "completed", label: "Completado" },
];

const ORDER: Record<string, number> = {
  requested: 0,
  broadcasting: 0,
  accepted: 1,
  in_progress: 2,
  completed: 3,
};

export function JobStatusTimeline({ status }: { status: JobStatus }) {
  if (status === "cancelled" || status === "expired") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">
        <XCircle className="size-5" />
        <span className="font-medium">
          {status === "cancelled" ? "Pedido cancelado" : "Pedido vencido"}
        </span>
      </div>
    );
  }

  const current = ORDER[status] ?? 0;

  return (
    <ol className="flex items-center">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step.key} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span
                className={cn(
                  "h-0.5 flex-1",
                  i === 0 ? "opacity-0" : done || active ? "bg-primary" : "bg-border",
                )}
              />
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs",
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground",
                )}
              >
                {done ? (
                  <Check className="size-4" />
                ) : active ? (
                  <Clock className="size-4" />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cn(
                  "h-0.5 flex-1",
                  i === STEPS.length - 1
                    ? "opacity-0"
                    : done
                      ? "bg-primary"
                      : "bg-border",
                )}
              />
            </div>
            <span
              className={cn(
                "mt-1.5 text-center text-xs",
                active || done ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
