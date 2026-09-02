"use client";

import { useEffect, useRef } from "react";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type PostgresChangesConfig = {
  event: "*" | "INSERT" | "UPDATE" | "DELETE";
  schema: string;
  table: string;
  filter?: string;
};

type UseRealtimeChannelOpts<T extends Record<string, unknown>> = {
  channelName: string;
  postgresChanges: PostgresChangesConfig;
  onChange: (payload: RealtimePostgresChangesPayload<T>) => void;
  enabled?: boolean;
};

/**
 * Suscripción a Realtime con auth del usuario actual, re-autenticación
 * automática cuando el token se refresca, y cleanup al desmontar.
 *
 * Resuelve dos issues:
 * 1. Race entre mount y setAuth: el subscribe corre DESPUÉS de setAuth,
 *    dentro de la misma promise chain, así el token siempre está en el
 *    RealtimeClient antes del phx_join.
 * 2. Token refresh: escucha onAuthStateChange para TOKEN_REFRESHED y
 *    reaplica setAuth. Sin esto, después de ~1h el WebSocket queda
 *    autenticado con un JWT vencido y los eventos dejan de llegar.
 *
 * IMPORTANTE: `postgresChanges` debe ser estable entre renders (useMemo o
 * constante fuera del componente). Si se construye inline en cada render,
 * dispara un re-subscribe en cada render.
 */
export function useRealtimeChannel<T extends Record<string, unknown>>({
  channelName,
  postgresChanges,
  onChange,
  enabled = true,
}: UseRealtimeChannelOpts<T>) {
  // Guardar el handler en un ref para que cambios en la closure no
  // fuercen re-subscribe (que es costoso: cierra el channel, abre uno nuevo).
  const handlerRef = useRef(onChange);
  useEffect(() => {
    handlerRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    let channel: RealtimeChannel | undefined;
    let cancelled = false;

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await supabase.realtime.setAuth(session?.access_token);
      if (cancelled) return;

      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          postgresChanges as any,
          (payload) =>
            handlerRef.current(payload as RealtimePostgresChangesPayload<T>),
        )
        .subscribe();
    })();

    // Re-authenticate cuando el token se refresca (evita que el WS quede
    // con JWT vencido después de ~1h y los eventos dejen de llegar).
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        void supabase.realtime.setAuth(session?.access_token);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
    // channelName y postgresChanges deben ser estables (useMemo en el caller).
    // Si cambian, se re-suscribe automáticamente.
  }, [channelName, postgresChanges, enabled]);
}
