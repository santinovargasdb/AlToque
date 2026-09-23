"use client";

import { useMemo, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toggleOnline, getIncomingJobs } from "@/lib/actions/dispatch";
import { useRealtimeChannel } from "@/hooks/use-realtime-channel";
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

  // Suscripciones Realtime: cambios en mis dispatch o en jobs invalidan el feed.
  const dispatchChanges = useMemo(
    () => ({
      event: "*" as const,
      schema: "public",
      table: "job_dispatch",
      filter: `provider_id=eq.${providerId}`,
    }),
    [providerId],
  );
  const jobsChanges = useMemo(
    () => ({ event: "UPDATE" as const, schema: "public", table: "jobs" }),
    [],
  );

  useRealtimeChannel({
    channelName: `dispatch-${providerId}`,
    postgresChanges: dispatchChanges,
    onChange: () => qc.invalidateQueries({ queryKey: ["incoming-jobs"] }),
    enabled: online,
  });
  useRealtimeChannel({
    channelName: `dispatch-jobs-${providerId}`,
    postgresChanges: jobsChanges,
    onChange: () => qc.invalidateQueries({ queryKey: ["incoming-jobs"] }),
    enabled: online,
  });

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
          "flex items-center justify-between rounded-md border p-4 transition-colors duration-150",
          online
            ? "border-success/40 bg-success/5"
            : "border-border bg-card",
        )}
      >
        <div className="flex items-center gap-3">
          {/* Signal / radio SVG */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(online ? "text-success" : "text-muted-foreground")}
            aria-hidden="true"
          >
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <circle cx="12" cy="20" r="1" fill="currentColor" />
          </svg>
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
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-150",
            online ? "bg-success" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "inline-block size-5 transform rounded-full bg-white transition-transform duration-150",
              online ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      {/* Feed */}
      {online &&
        (data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-10 text-center text-muted-foreground">
            {pending ? (
              <svg
                className="size-6 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
              </svg>
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
