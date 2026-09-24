import { emailLayout, emailButton } from "./layout";
import type { EmailContent } from "./welcome";

/**
 * Resultado de la verificación de identidad del profesional.
 * Aprobado → celebrar y mandarlo al panel. Rechazado → decirle exactamente
 * qué corregir (el motivo lo escribe el admin) y linkear a re-enviar.
 */
export function verificationResultEmail(params: {
  name: string;
  status: "approved" | "rejected";
  reason?: string;
  appUrl: string;
}): EmailContent {
  if (params.status === "approved") {
    const bodyHtml = `
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;">¡Tu verificación fue aprobada, ${params.name}!</h1>
      <p style="margin:0 0 16px;">Ya aparecés en las búsquedas de tu zona. Ponete en línea para empezar a recibir pedidos urgentes, o esperá los agendados de tus oficios.</p>
      ${emailButton("Ir a mi panel", `${params.appUrl}/pro/inicio`)}
    `;
    return {
      subject: "Tu verificación fue aprobada: ya podés recibir pedidos",
      html: emailLayout({
        title: "Verificación aprobada",
        preheader: "Ya aparecés en las búsquedas. Ponete en línea cuando quieras.",
        bodyHtml,
      }),
    };
  }

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;">Necesitamos que revises tus documentos, ${params.name}</h1>
    <p style="margin:0 0 12px;">Tu verificación fue rechazada por este motivo:</p>
    <blockquote style="margin:0 0 16px;padding:12px 16px;border-left:3px solid #DC2626;background:#FEF2F2;color:#0F172A;">${escapeHtml(params.reason ?? "Documentos ilegibles o incompletos.")}</blockquote>
    <p style="margin:0 0 16px;">Corregilo y volvé a enviar los documentos: la revisión es rápida.</p>
    ${emailButton("Reenviar documentos", `${params.appUrl}/pro/verificacion`)}
  `;
  return {
    subject: "Tu verificación fue rechazada: mirá el motivo y reenviá",
    html: emailLayout({
      title: "Verificación rechazada",
      preheader: "Hay un detalle a corregir en tus documentos.",
      bodyHtml,
    }),
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
