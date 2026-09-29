/**
 * Escapa texto para interpolarlo de forma segura dentro del HTML de un email.
 * Los templates arman HTML con template strings, así que cualquier dato de
 * usuario (nombre, user-agent, IP, motivo de rechazo) DEBE pasar por acá antes
 * de meterse en el markup — si no, un nombre como `<img onerror=…>` queda
 * inyectado en el correo (XSS en el cliente de mail).
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
