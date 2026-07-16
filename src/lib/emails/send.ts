import "server-only";
import { Resend } from "resend";

/**
 * Servicio de envío de emails transaccionales vía Resend.
 *
 * Mismo espíritu que Web Push: **no-op sin `RESEND_API_KEY`** (dev/preview
 * funcionan sin configurar nada; solo se informa por consola). El remitente
 * sale de `EMAIL_FROM` (dominio verificado en Resend) con un default seguro.
 *
 * Nunca lanza: un fallo de email jamás rompe el flujo que lo disparó —
 * llamar con `void sendEmail(...)` para fire-and-forget.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`[emails] RESEND_API_KEY ausente; se omite: "${params.subject}"`);
    return false;
  }

  try {
    const resend = new Resend(apiKey);
    const from =
      process.env.EMAIL_FROM ?? "AlToque <notificaciones@altoque.app>";
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (error) {
      console.error("[emails] Resend devolvió error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[emails] fallo inesperado al enviar:", err);
    return false;
  }
}
