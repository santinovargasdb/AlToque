import "server-only";
import { getRequestContext } from "@/lib/audit";
import { parseUserAgent } from "@/lib/security-utils";
import { securityAlertEmail } from "./security-alert";
import { sendEmail } from "./send";

/**
 * Dispara el email de alerta de seguridad con el contexto (IP + dispositivo)
 * de la request actual. Fire-and-forget por diseño: jamás lanza — un fallo
 * de email nunca debe romper un login ni una (des)vinculación.
 *
 * @param eventLabel Descripción humana del evento, ej.
 *   "un inicio de sesión desde un dispositivo nuevo".
 */
export async function sendSecurityAlert(params: {
  to: string;
  name: string;
  eventLabel: string;
}): Promise<void> {
  try {
    const { ipAddress, userAgent } = await getRequestContext();
    const { browser, os } = parseUserAgent(userAgent);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const { subject, html } = securityAlertEmail({
      name: params.name,
      eventLabel: params.eventLabel,
      browser,
      os,
      ipAddress,
      date: new Date(),
      appUrl,
    });
    await sendEmail({ to: params.to, subject, html });
  } catch (err) {
    console.error("[emails] fallo al preparar la alerta de seguridad:", err);
  }
}
