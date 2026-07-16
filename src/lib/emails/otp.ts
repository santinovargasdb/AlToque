import { emailLayout } from "./layout";
import type { EmailContent } from "./welcome";

/**
 * Template del código de un solo uso (OTP).
 *
 * IMPORTANTE: los emails de OTP los envía SUPABASE (no la app). Este
 * template existe para pegar su HTML en Supabase → Authentication →
 * Email Templates → "Magic Link / OTP", generándolo con el placeholder
 * `{{ .Token }}` (ver docs/supabase-otp-email-template.html, que es
 * exactamente `otpEmail("{{ .Token }}").html`).
 */
export function otpEmail(code: string): EmailContent {
  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;">Tu código de acceso</h1>
    <p style="margin:0 0 20px;">Usalo para entrar a AlToque. Vence en unos minutos y solo sirve una vez.</p>
    <div style="background-color:#F8FAFC;border:1px dashed #2563EB;border-radius:10px;padding:20px;text-align:center;margin:0 0 20px;">
      <span style="font-size:34px;font-weight:700;letter-spacing:10px;color:#2563EB;font-family:'Courier New',monospace;">${code}</span>
    </div>
    <p style="margin:0;color:#64748B;font-size:14px;">Si no pediste este código, ignorá este email: nadie puede entrar sin él.</p>
  `;

  return {
    subject: "Tu código de acceso a AlToque",
    html: emailLayout({
      title: "Código de acceso",
      preheader: "Tu código de un solo uso para entrar a AlToque.",
      bodyHtml,
    }),
  };
}
