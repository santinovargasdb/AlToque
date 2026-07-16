"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Link2, Unlink } from "lucide-react";
import type { UserIdentity } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { logAuthError } from "@/lib/auth-log";
import { recordUnlinkAudit } from "@/lib/actions/audit";

/**
 * Gestor de vinculación de Google en la configuración de la cuenta.
 *
 * - **Vincular**: `linkIdentity` (OAuth manual linking de Supabase) — el
 *   browser pasa por Google y vuelve por `/auth/callback?next={returnTo}`.
 * - **Desvincular**: `unlinkIdentity`, SOLO si el usuario conserva otra vía
 *   de acceso verificada: exige identidad `email` con el email confirmado
 *   (contraseña o código OTP siguen funcionando) y más de una identidad.
 *   Esto evita el lockout de cuentas que solo entran con Google.
 *
 * La desvinculación pide una segunda confirmación en el propio botón (dos
 * clics) en lugar de un dialog nativo. Todo error se registra con
 * `logAuthError` y se informa por toast.
 *
 * Requiere habilitar "Manual linking" en Supabase → Authentication → Settings.
 *
 * @param returnTo Ruta interna a la que volver tras el OAuth de vinculación
 *   (ej. "/perfil" o "/pro/perfil").
 */
export function GoogleAccountLink({ returnTo }: { returnTo: string }) {
  const [identities, setIdentities] = useState<UserIdentity[] | null>(null);
  const [working, setWorking] = useState(false);
  const [confirmingUnlink, setConfirmingUnlink] = useState(false);

  const loadIdentities = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUserIdentities();
    if (error) {
      logAuthError("perfil:load-identities", error);
      setIdentities([]);
      return;
    }
    setIdentities(data.identities);
  }, []);

  useEffect(() => {
    void loadIdentities();
  }, [loadIdentities]);

  if (identities === null) {
    // Skeleton con la MISMA geometría que la fila real (evita CLS).
    return (
      <div
        className="flex items-center justify-between gap-3"
        aria-busy="true"
        aria-label="Cargando métodos de acceso"
      >
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
    );
  }

  const googleIdentity = identities.find((i) => i.provider === "google");
  const emailIdentity = identities.find((i) => i.provider === "email");
  // Anti-lockout: sin identidad de email verificada, desvincular Google
  // dejaría la cuenta sin ninguna forma de entrar.
  const canUnlink =
    !!googleIdentity && !!emailIdentity && identities.length > 1;

  async function link() {
    setWorking(true);
    const supabase = createClient();
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", returnTo);
    // flow=link: el callback lo audita como identity_link (no como login).
    callback.searchParams.set("flow", "link");
    const { error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: { redirectTo: callback.toString() },
    });
    // Sin error, el browser está navegando a Google: dejamos el loading.
    if (error) {
      setWorking(false);
      logAuthError("perfil:link-google", error);
      toast.error(
        error.message.toLowerCase().includes("manual linking")
          ? "La vinculación de cuentas no está habilitada todavía."
          : "No pudimos vincular tu cuenta de Google. Probá de nuevo.",
      );
    }
  }

  async function unlink() {
    if (!confirmingUnlink) {
      setConfirmingUnlink(true);
      return;
    }
    if (!googleIdentity) return;
    setWorking(true);
    const supabase = createClient();
    const { error } = await supabase.auth.unlinkIdentity(googleIdentity);
    setWorking(false);
    setConfirmingUnlink(false);
    if (error) {
      logAuthError("perfil:unlink-google", error);
      toast.error("No pudimos desvincular Google. Probá de nuevo.");
      return;
    }
    // Audit trail + alerta de seguridad (server-side; fire-and-forget).
    void recordUnlinkAudit();
    toast.success("Cuenta de Google desvinculada.");
    await loadIdentities();
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">Google</span>
          {googleIdentity ? (
            <Badge variant="success">Vinculada</Badge>
          ) : (
            <Badge variant="secondary">No vinculada</Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {googleIdentity
            ? canUnlink
              ? "Podés entrar con tu cuenta de Google."
              : "Es tu único método de acceso: configurá una contraseña antes de desvincular."
            : "Vinculala para entrar con un clic."}
        </p>
      </div>

      {googleIdentity ? (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 text-destructive"
          onClick={unlink}
          disabled={working || !canUnlink}
        >
          {working ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Unlink className="size-4" />
          )}
          {confirmingUnlink ? "¿Seguro? Desvincular" : "Desvincular"}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={link}
          disabled={working}
        >
          {working ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Link2 className="size-4" />
          )}
          Vincular
        </Button>
      )}
    </div>
  );
}
