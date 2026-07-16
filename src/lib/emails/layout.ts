/**
 * Layout HTML compartido de todos los emails de AlToque.
 *
 * Reglas de emails (por eso NO usa clases de Tailwind):
 *  - Estilos inline y layout con <table>: es lo único que renderiza
 *    consistente en Gmail/Outlook/Apple Mail.
 *  - Una sola columna, máx 480px, tipografía del sistema → mobile-first.
 *  - Colores = design tokens del proyecto (primary #2563EB, bg #F8FAFC,
 *    text #0F172A, muted #64748B, border #E2E8F0, radius 16px).
 *
 * Módulo puro (sin "server-only") para poder testear los templates.
 */

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export type EmailLayoutParams = {
  /** Título del documento (algunos clientes lo muestran). */
  title: string;
  /** Texto de preview que muestran las bandejas de entrada (oculto en el body). */
  preheader: string;
  /** Contenido interno de la card (HTML ya formateado). */
  bodyHtml: string;
};

/** Envuelve el contenido en el esqueleto de marca de AlToque. */
export function emailLayout({
  title,
  preheader,
  bodyHtml,
}: EmailLayoutParams): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F8FAFC;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
            <tr>
              <td style="padding-bottom:20px;text-align:center;font-family:${FONT_STACK};">
                <span style="display:inline-block;background-color:#2563EB;color:#ffffff;border-radius:10px;padding:8px 14px;font-size:18px;font-weight:700;">&#9889; AlToque</span>
              </td>
            </tr>
            <tr>
              <td style="background-color:#ffffff;border:1px solid #E2E8F0;border-radius:16px;padding:32px 28px;font-family:${FONT_STACK};color:#0F172A;font-size:16px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding-top:20px;text-align:center;font-family:${FONT_STACK};font-size:12px;color:#64748B;line-height:1.5;">
                AlToque — Profesionales de oficios verificados.<br />
                Recibiste este email por tu cuenta en AlToque.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Botón de acción primario (estilos de marca, inline). */
export function emailButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto 8px;">
    <tr>
      <td style="background-color:#2563EB;border-radius:10px;">
        <a href="${href}" style="display:inline-block;padding:12px 28px;font-family:${FONT_STACK};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${label}</a>
      </td>
    </tr>
  </table>`;
}
