"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Loader2, Check, X, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatDistance } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { acceptJob, declineJob, type IncomingJob } from "@/lib/actions/dispatch";

const TTL_MS = 10 * 60 * 1000;

export function IncomingJobCard({
  job,
  onResolved,
}: {
  job: IncomingJob;
  onResolved: () => void;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [pending, startTransition] = useTransition();
  const [remaining, setRemaining] = useState<number | null>(null);

  // Cuenta regresiva (cliente) desde la creación del pedido.
  useEffect(() => {
    const created = new Date(job.createdAt).getTime();
    const tick = () => setRemaining(Math.max(0, created + TTL_MS - Date.now()));
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [job.createdAt]);

  const mmss =
    remaining == null
      ? "--:--"
      : `${String(Math.floor(remaining / 60000)).padStart(2, "0")}:${String(
          Math.floor((remaining % 60000) / 1000),
        ).padStart(2, "0")}`;

  function accept() {
    startTransition(async () => {
      const res = await acceptJob(job.id);
      if (!res.ok) {
        toast.error(res.error);
        onResolved();
        return;
      }
      toast.success("¡Pedido aceptado!");
      router.push(`/pro/pedido/${job.id}`);
    });
  }

  function decline() {
    startTransition(async () => {
      await declineJob(job.id);
      onResolved();
    });
  }

  const low = remaining != null && remaining < 120000;

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={spring.smooth}
      className="rounded-md border border-action/40 bg-action/5 p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Badge variant="warning">Urgente</Badge>
          <h3 className="mt-1 truncate font-medium">{job.title}</h3>
          <p className="text-sm text-muted-foreground">{job.categoryName}</p>
        </div>
        <motion.span
          className={cn(
            "flex items-center gap-1 text-sm font-semibold",
            low ? "text-destructive" : "text-action",
          )}
          animate={!reduce && low ? { scale: [1, 1.07, 1] } : { scale: 1 }}
          transition={
            low
              ? { duration: 1, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.2 }
          }
        >
          <Clock className="size-4" /> {mmss}
        </motion.span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 text-sm text-muted-foreground">
        {job.distanceKm != null && (
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" /> {formatDistance(job.distanceKm)}
          </span>
        )}
        {job.addressText && <span className="truncate">{job.addressText}</span>}
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          variant="success"
          className="flex-1"
          onClick={accept}
          disabled={pending}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Aceptar
        </Button>
        <Button variant="outline" onClick={decline} disabled={pending}>
          <X className="size-4" /> Rechazar
        </Button>
      </div>
    </motion.article>
  );
}
