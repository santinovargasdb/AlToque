/**
 * Utilidades puras de seguridad (sin DB ni "server-only": las usan el
 * audit trail, los emails y los tests).
 */

/** Enmascara un email para auditoría: "juan.perez@dominio.com" → "j***@dominio.com". */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  return `${local.charAt(0)}***@${domain}`;
}

export type DeviceInfo = { browser: string; os: string };

/**
 * Parser liviano de user-agent → navegador + sistema operativo aproximados
 * (suficiente para mostrar "Chrome · Android" en la actividad de seguridad;
 * sin dependencias externas). El orden de los checks importa: Edge y Opera
 * incluyen "Chrome/" en su UA, y Chrome incluye "Safari/".
 */
export function parseUserAgent(ua: string | null): DeviceInfo {
  if (!ua) return { browser: "Desconocido", os: "Desconocido" };

  const browser = ua.includes("Edg/")
    ? "Edge"
    : ua.includes("OPR/") || ua.includes("Opera")
      ? "Opera"
      : ua.includes("SamsungBrowser")
        ? "Samsung Internet"
        : ua.includes("Firefox/")
          ? "Firefox"
          : ua.includes("Chrome/")
            ? "Chrome"
            : ua.includes("Safari/")
              ? "Safari"
              : "Desconocido";

  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iPod/.test(ua)
        ? "iOS"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Desconocido";

  return { browser, os };
}
