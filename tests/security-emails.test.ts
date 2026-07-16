import { describe, it, expect } from "vitest";
import { parseUserAgent, maskEmail } from "@/lib/security-utils";
import { welcomeEmail } from "@/lib/emails/welcome";
import { securityAlertEmail } from "@/lib/emails/security-alert";
import { otpEmail } from "@/lib/emails/otp";

describe("parseUserAgent · navegador + OS aproximados", () => {
  it.each([
    [
      "Chrome en Windows",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      { browser: "Chrome", os: "Windows" },
    ],
    [
      "Safari en iPhone",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      { browser: "Safari", os: "iOS" },
    ],
    [
      "Firefox en Linux",
      "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0",
      { browser: "Firefox", os: "Linux" },
    ],
    [
      "Edge en Windows (incluye Chrome/ en el UA)",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
      { browser: "Edge", os: "Windows" },
    ],
    [
      "Chrome en Android",
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
      { browser: "Chrome", os: "Android" },
    ],
  ])("detecta %s", (_label, ua, expected) => {
    expect(parseUserAgent(ua)).toEqual(expected);
  });

  it("devuelve Desconocido con UA nulo o raro", () => {
    expect(parseUserAgent(null)).toEqual({
      browser: "Desconocido",
      os: "Desconocido",
    });
    expect(parseUserAgent("curl/8.0")).toEqual({
      browser: "Desconocido",
      os: "Desconocido",
    });
  });
});

describe("maskEmail · sin PII en el audit trail", () => {
  it("enmascara el local-part conservando el dominio", () => {
    expect(maskEmail("juan.perez@dominio.com")).toBe("j***@dominio.com");
  });
  it("degrada seguro con entradas inválidas", () => {
    expect(maskEmail("no-es-un-email")).toBe("***");
  });
});

describe("templates de email · contenido y seguridad", () => {
  it("bienvenida: personaliza nombre y CTA por rol", () => {
    const client = welcomeEmail({
      name: "Ana",
      role: "client",
      appUrl: "https://altoque.app",
    });
    expect(client.html).toContain("Ana");
    expect(client.html).toContain("https://altoque.app/inicio");

    const pro = welcomeEmail({
      name: "Luis",
      role: "provider",
      appUrl: "https://altoque.app",
    });
    expect(pro.html).toContain("https://altoque.app/pro/inicio");
    expect(pro.html).toContain("oficios");
  });

  it("alerta de seguridad: incluye evento, dispositivo e IP (o fallback)", () => {
    const { subject, html } = securityAlertEmail({
      name: "Ana",
      eventLabel: "un inicio de sesión desde un dispositivo nuevo",
      browser: "Chrome",
      os: "Android",
      ipAddress: "190.190.1.1",
      date: new Date("2026-07-16T12:00:00Z"),
      appUrl: "https://altoque.app",
    });
    expect(subject).toContain("Alerta de seguridad");
    expect(html).toContain("Chrome · Android");
    expect(html).toContain("190.190.1.1");
    expect(html).toContain("https://altoque.app/perfil");

    const sinIp = securityAlertEmail({
      name: "Ana",
      eventLabel: "x",
      browser: "Chrome",
      os: "Android",
      ipAddress: null,
      date: new Date(),
      appUrl: "https://altoque.app",
    });
    expect(sinIp.html).toContain("No disponible");
  });

  it("OTP: muestra el código y es mobile-friendly (viewport + 480px)", () => {
    const { html } = otpEmail("123456");
    expect(html).toContain("123456");
    expect(html).toContain('name="viewport"');
    expect(html).toContain("max-width:480px");
  });
});
