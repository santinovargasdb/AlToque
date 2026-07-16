"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  Zap,
  Info,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDateTime } from "@/lib/utils";

/** Fila de `notifications` (snake_case, como llega de supabase-js/Realtime). */
type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

/** Ícono por tipo de notificación (dominio + genéricos), con fallback. */
const TYPE_ICON: Record<string, typeof Bell> = {
  new_urgent_job: Zap,
  job_accepted: Check,
  new_message: MessageSquare,
  info: Info,
  success: Check,
  warning: Info,
  action_required: Info,
};

/**
 * Campanita de notificaciones in-app del header.
 *
 * - Badge (punto rojo con contador) si hay no leídas; el conteo se carga al
 *   montar y se mantiene vivo por Supabase Realtime (INSERT en
 *   `notifications`; RLS limita a las propias).
 * - El dropdown carga las últimas 12 al abrirse (skeletons mientras tanto,
 *   sin saltos), permite marcar leídas una por una o todas, y al hacer
 *   click navega al `link` de la notificación.
 * - Transiciones con tw-animate-css; cierre por click afuera.
 *
 * @param userId Uid del usuario logueado (filtro del canal Realtime).
 */
export function NotificationsBell({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[] | null>(null);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  // Conteo inicial de no leídas + suscripción Realtime a las nuevas.
  useEffect(() => {
    const supabase = createClient();

    void supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null)
      .then(({ count }) => setUnread(count ?? 0));

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          setUnread((n) => n + 1);
          setItems((prev) =>
            prev && !prev.some((p) => p.id === row.id)
              ? [row, ...prev]
              : prev,
          );
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadItems = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, body, link, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12);
    setItems((data as NotificationRow[] | null) ?? []);
  }, [userId]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && items === null) void loadItems();
  }

  async function markRead(id: string) {
    setItems(
      (prev) =>
        prev?.map((n) =>
          n.id === id && !n.read_at
            ? { ...n, read_at: new Date().toISOString() }
            : n,
        ) ?? null,
    );
    setUnread((n) => Math.max(0, n - 1));
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .is("read_at", null);
  }

  async function markAllRead() {
    const now = new Date().toISOString();
    setItems((prev) => prev?.map((n) => ({ ...n, read_at: n.read_at ?? now })) ?? null);
    setUnread(0);
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", userId)
      .is("read_at", null);
  }

  function onItemClick(n: NotificationRow) {
    if (!n.read_at) void markRead(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notificaciones${unread > 0 ? ` (${unread} sin leer)` : ""}`}
        aria-expanded={open}
        className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground animate-in zoom-in duration-200">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Cierre por click afuera. */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-top-2 rounded-xl border border-border bg-card shadow-lg duration-200"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <p className="text-sm font-semibold">Notificaciones</p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs font-medium text-primary"
                >
                  <CheckCheck className="size-3.5" /> Marcar todas como leídas
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {items === null ? (
                // Skeletons con la geometría de una fila real (sin saltos).
                <div className="space-y-3 p-4" aria-busy="true">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="size-8 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No tenés notificaciones todavía.
                </p>
              ) : (
                <ul>
                  {items.map((n) => {
                    const Icon = TYPE_ICON[n.type] ?? Bell;
                    const isUnread = !n.read_at;
                    return (
                      <li key={n.id} className="border-b border-border last:border-0">
                        <button
                          type="button"
                          onClick={() => onItemClick(n)}
                          className={cn(
                            "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/60",
                            isUnread && "bg-primary/5",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                              isUnread
                                ? "bg-primary/10 text-primary"
                                : "bg-secondary text-muted-foreground",
                            )}
                          >
                            <Icon className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              className={cn(
                                "block truncate text-sm",
                                isUnread ? "font-semibold" : "font-medium",
                              )}
                            >
                              {n.title}
                            </span>
                            {n.body && (
                              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                {n.body}
                              </span>
                            )}
                            <span className="mt-0.5 block text-[11px] text-muted-foreground">
                              {formatDateTime(n.created_at)}
                            </span>
                          </span>
                          {isUnread && (
                            <span
                              className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                              aria-label="No leída"
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
