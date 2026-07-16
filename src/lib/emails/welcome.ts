import { emailLayout, emailButton } from "./layout";

export type EmailContent = { subject: string; html: string };

/**
 * Email de bienvenida — se envía cuando el usuario COMPLETA el onboarding
 * (`completeProfile`), no al registrarse: recién ahí la cuenta está
 * operativa de verdad.
 */
export function welcomeEmail(params: {
  name: string;
  role: "client" | "provider";
  appUrl: string;
}): EmailContent {
  const isPro = params.role === "provider";
  const home = `${params.appUrl}${isPro ? "/pro/inicio" : "/inicio"}`;

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;">¡Bienvenido a AlToque, ${params.name}! 👋</h1>
    <p style="margin:0 0 16px;">Tu cuenta ya está lista.</p>
    ${
      isPro
        ? `<p style="margin:0 0 8px;">Próximos pasos para empezar a recibir pedidos:</p>
           <ol style="margin:0 0 16px;padding-left:20px;color:#0F172A;">
             <li style="margin-bottom:6px;">Cargá tus <strong>oficios y zona de trabajo</strong>.</li>
             <li style="margin-bottom:6px;">Verificá tu identidad (DNI + selfie).</li>
             <li>Ponete <strong>online</strong> y empezá a recibir urgencias cerca tuyo.</li>
           </ol>`
        : `<p style="margin:0 0 16px;">Buscá plomeros, cerrajeros, electricistas y más profesionales <strong>verificados</strong> cerca tuyo, para urgencias o trabajos agendados. Pagá en efectivo o por la app con Mercado Pago.</p>`
    }
    ${emailButton(isPro ? "Completar mi perfil profesional" : "Buscar profesionales", home)}
  `;

  return {
    subject: "¡Bienvenido a AlToque! Tu cuenta está lista",
    html: emailLayout({
      title: "Bienvenido a AlToque",
      preheader: "Tu cuenta está lista. Esto es lo que podés hacer ahora.",
      bodyHtml,
    }),
  };
}
