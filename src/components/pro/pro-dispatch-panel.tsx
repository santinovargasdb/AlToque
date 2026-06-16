"use client";

import { useEffect, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Radio, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toggleOnline, getIncomingJobs } from "@/lib/actions/dispatch";
import { IncomingJobCard } from "./incoming-job-card";

/**
 * Panel de despacho del profesional: toggle online/offline (optimista) +
 * feed de pedidos urgentes entrantes en tiempo real (Supabase Realtime sobre
 * job_dispatch, con TanStack Query como cache + refetch de respaldo).
 */
export function ProDispatchPanel({
  providerId,
  initialOnline,
}: {
  providerId: string;
  initialOnline: boolean;
}) {
  const qc = useQueryClient();
  const [online, setOnline] = useState(initialOnline);
  const [pending, startTransition] = useTransition();

  const { data = [] } = useQuery({
    queryKey: ["incoming-jobs"],
    queryFn: () => getIncomingJobs(),
    refetchInterval: online ? 20_000 : false,
    enabled: online,
  });

  // Suscripción Realtime: cualquier cambio en mis dispatch o en jobs invalida.
  useEffect(() => {
    if (!online) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`dispatch-${providerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "job_dispatch",
          filter: `provider_id=eq.${providerId}`,
        },
        () => qc.invalidateQueries({ queryKey: ["incoming-jobs"] }),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "jobs" },
        () => qc.invalidateQueries({ queryKey: ["incoming-jobs"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [providerId, online, qc]);

  function toggle() {
    const next = !online;
    setOnline(next); // optimista
    startTransition(async () => {
      const res = await toggleOnline(next);
      if (!res.ok) {
        setOnline(!next);
        toast.error(res.error);
        return;
      }
      if (next) qc.invalidateQueries({ queryKey: ["incoming-jobs"] });
    });
  }

  return (
    <section className="space-y-4">
      {/* Toggle */}
      <div
        className={cn(
          "flex items-center justify-between rounded-xl border p-4 transition-colors",
          online
            ? "border-success/40 bg-success/5"
            : "border-border bg-card",
        )}
      >
        <div className="flex items-center gap-3">
          <Radio
            className={cn(
              "size-5",
              online ? "text-success" : "text-muted-foreground",
            )}
          />
          <div>
            <p className="font-medium">
              {online ? "En línea" : "Desconectado"}
            </p>
            <p className="text-sm text-muted-foreground">
              {online
                ? "Recibís pedidos urgentes cercanos"
                : "Activá para recibir urgencias"}
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={online}
          onClick={toggle}
          disabled={pending}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            online ? "bg-success" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "inline-block size-5 transform rounded-full bg-white shadow transition-transform",
              online ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      {/* Feed */}
      {online &&
        (data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center text-muted-foreground">
            {pending ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <Inbox className="size-6" />
            )}
            <p className="text-sm">Esperando pedidos urgentes…</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((job) => (
              <IncomingJobCard
                key={job.id}
                job={job}
                onResolved={() =>
                  qc.invalidateQueries({ queryKey: ["incoming-jobs"] })
                }
              />
            ))}
          </div>
        ))}
    </section>
  );
}
