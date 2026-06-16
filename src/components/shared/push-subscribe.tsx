"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { urlBase64ToUint8Array } from "@/lib/push/vapid";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/**
 * Toggle "Activar notificaciones" (Web Push). Pide permiso, suscribe vía el
 * service worker y registra la suscripción en `/api/push/subscribe`.
 *
 * No se renderiza si el navegador no soporta push o falta la clave VAPID
 * pública (degradación elegante — ej. iOS sin la PWA instalada).
 */
export function PushSubscribe({ className }: { className?: string }) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window &&
      !!VAPID_PUBLIC_KEY;
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  if (!supported) return null;

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Activá el permiso de notificaciones en el navegador.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("subscribe failed");
      setSubscribed(true);
      toast.success("Notificaciones activadas");
    } catch {
      toast.error("No pudimos activar las notificaciones.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Notificaciones desactivadas");
    } catch {
      toast.error("No pudimos desactivar las notificaciones.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={subscribed ? disable : enable}
      disabled={busy}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors disabled:opacity-60",
        subscribed
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card hover:border-primary/40",
        className,
      )}
    >
      {busy ? (
        <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" />
      ) : subscribed ? (
        <Bell className="size-5 shrink-0 text-primary" />
      ) : (
        <BellOff className="size-5 shrink-0 text-muted-foreground" />
      )}
      <span className="flex-1">
        <span className="block font-medium">
          {subscribed ? "Notificaciones activadas" : "Activar notificaciones"}
        </span>
        <span className="block text-sm text-muted-foreground">
          {subscribed
            ? "Tocá para desactivarlas"
            : "Recibí avisos aunque no tengas la app abierta"}
        </span>
      </span>
    </button>
  );
}
