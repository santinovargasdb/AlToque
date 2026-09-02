"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRealtimeChannel } from "@/hooks/use-realtime-channel";
import { cancelBroadcastJob } from "@/lib/actions/dispatch";

const TIMEOUT_MS = 10 * 60 * 1000;

type InitialJob = {
  title: string;
  categoryName: string;
  addressText: string | null;
};

export function EsperandoView({
  jobId,
  initialJob,
}: {
  jobId: string;
  initialJob: InitialJob;
}) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const postgresChanges = useMemo(
    () => ({
      event: "UPDATE" as const,
      schema: "public",
      table: "jobs",
      filter: `id=eq.${jobId}`,
    }),
    [jobId],
  );

  useRealtimeChannel<{ status: string }>({
    channelName: `job-status-${jobId}`,
    postgresChanges,
    onChange: (payload) => {
      const { status } = payload.new as { status: string };
      if (status === "accepted" || status === "in_progress") {
        router.replace(`/pedido/${jobId}`);
      } else if (status === "cancelled" || status === "expired") {
        setTimedOut(true);
      }
    },
  });

  function cancelAndGo(destination: string) {
    startTransition(async () => {
      await cancelBroadcastJob(jobId);
      router.push(destination);
    });
  }

  if (timedOut) {
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <AlertCircle className="size-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-semibold">
            No hay profesionales disponibles ahora
          </p>
          <p className="text-sm text-muted-foreground">
            No encontramos ningún {initialJob.categoryName.toLowerCase()} cerca
            de {initialJob.addressText ?? "tu zona"} en este momento.
          </p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <Button
            onClick={() => cancelAndGo("/pedido/urgente")}
            disabled={pending}
          >
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Volver a intentar
          </Button>
          <Button
            variant="outline"
            onClick={() => cancelAndGo("/buscar")}
            disabled={pending}
          >
            Agendar para más tarde
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 py-16 text-center">
      <Loader2 className="size-16 animate-spin text-primary" />
      <div className="space-y-1.5">
        <p className="text-xl font-semibold">Buscando profesional…</p>
        <p className="text-sm text-muted-foreground">
          {initialJob.categoryName} · {initialJob.addressText ?? "tu zona"}
        </p>
        <p className="text-sm font-medium">{initialJob.title}</p>
      </div>

      <div className="flex flex-col items-center gap-2">
        {!confirming ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(true)}
            className="text-muted-foreground"
          >
            Cancelar solicitud
          </Button>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm font-medium">¿Cancelar la búsqueda?</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => cancelAndGo("/inicio")}
                disabled={pending}
              >
                {pending && <Loader2 className="mr-1 size-3.5 animate-spin" />}
                Sí, cancelar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirming(false)}
                disabled={pending}
              >
                Seguir buscando
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
