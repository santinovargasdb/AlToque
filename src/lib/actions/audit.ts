"use server";

import { getSession } from "@/lib/auth";
import { logSecurityEvent } from "@/lib/audit";
import { sendSecurityAlert } from "@/lib/emails/security-events";
import type { ActionResult } from "./provider";

/**
 * Audita la desvinculación de Google, que ocurre 100% en el browser
 * (`unlinkIdentity` con el anon key) y por eso no pasa por ninguna Server
 * Action que pueda loggearla sola.
 *
 * Superficie segura: acción fija (no la elige el cliente) y siempre sobre
 * el usuario de la sesión — lo peor que puede hacer un cliente malicioso
 * es escribir un evento verídico en su PROPIO historial.
 */
export async function recordUnlinkAudit(): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "No autorizado." };

  void logSecurityEvent("identity_unlink", {
    userId: session.user.id,
    metadata: { provider: "google" },
  });
  if (session.user.email) {
    void sendSecurityAlert({
      to: session.user.email,
      name: session.profile?.fullName ?? "",
      eventLabel: "la desvinculación de tu cuenta de Google",
    });
  }
  return { ok: true };
}
