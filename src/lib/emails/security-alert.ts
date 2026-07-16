import { emailLayout, emailButton } from "./layout";
import type { EmailContent } from "./welcome";

const DATE_FMT = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

/**
 * Alerta de seguridad — se envía automáticamente cuando:
 *  - hay un login exitoso desde una IP/navegador nuevos (`isNewLoginContext`), o
 *  - se vincula/desvincula Google Auth en la cuenta.
 * Nunca incluye tokens ni credenciales: solo el contexto del evento.
 */
export function securityAlertEmail(params: {
  name: string;
  /** Descripción del evento, ej. "un inicio de sesión desde un dispositivo nuevo". */
  eventLabel: string;
  browser: string;
  os: string;
  ipAddress: string | null;
  date: Date;
  appUrl: string;
}): EmailContent {
  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;">🔒 Alerta de seguridad</h1>
    <p style="margin:0 0 16px;">Hola ${params.name}: detectamos <strong>${params.eventLabel}</strong> en tu cuenta de AlToque.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin:0 0 16px;">
      <tr><td style="padding:12px 16px;font-size:14px;color:#64748B;">Fecha</td><td style="padding:12px 16px;font-size:14px;text-align:right;font-weight:600;">${DATE_FMT.format(params.date)} (AR)</td></tr>
      <tr><td style="padding:0 16px 12px;font-size:14px;color:#64748B;">Dispositivo</td><td style="padding:0 16px 12px;font-size:14px;text-align:right;font-weight:600;">${params.browser} · ${params.os}</td></tr>
      <tr><td style="padding:0 16px 12px;font-size:14px;color:#64748B;">Dirección IP</td><td style="padding:0 16px 12px;font-size:14px;text-align:right;font-weight:600;">${params.ipAddress ?? "No disponible"}</td></tr>
    </table>
    <p style="margin:0 0 4px;"><strong>¿Fuiste vos?</strong> No hace falta que hagas nada.</p>
    <p style="margin:0 0 16px;color:#64748B;">Si no reconocés esta actividad, cambiá tu contraseña ahora y cerrá la sesión en todos los dispositivos desde tu perfil.</p>
    ${emailButton("Revisar la seguridad de mi cuenta", `${params.appUrl}/perfil`)}
  `;

  return {
    subject: "Alerta de seguridad en tu cuenta de AlToque",
    html: emailLayout({
      title: "Alerta de seguridad",
      preheader: `Detectamos ${params.eventLabel} en tu cuenta.`,
      bodyHtml,
    }),
  };
}
