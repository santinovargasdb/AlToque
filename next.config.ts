import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  // Service worker fuente y destino (PWA: push + offline básico)
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Desactivar SW en desarrollo evita cachear cambios durante el dev loop.
  disable: process.env.NODE_ENV === "development",
});

// ── Content-Security-Policy ─────────────────────────────────────────────────
// Permite los orígenes reales de la app (self + Supabase + Google Maps). Los
// scripts/estilos inline de Next necesitan 'unsafe-inline'; Maps puede requerir
// 'unsafe-eval'. Se sirve en modo REPORT-ONLY: no bloquea nada, solo reporta
// violaciones en la consola del browser. Verificá que no haya violaciones en
// los flujos con mapa (/buscar) y autocompletado de dirección, y recién ahí
// cambiá el header a `Content-Security-Policy` (enforced) — línea marcada abajo.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://*.googleapis.com https://*.gstatic.com https://*.ggpht.com https://*.googleusercontent.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://*.googleapis.com",
  "frame-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  // Al pasar a enforced (Content-Security-Policy) se puede agregar
  // "upgrade-insecure-requests" (se ignora en report-only; HSTS ya fuerza HTTPS).
].join("; ");

const securityHeaders = [
  // Fuerza HTTPS en el navegador durante 2 años (incluye subdominios).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Anti-clickjacking: la app no se embebe en ningún lado.
  { key: "X-Frame-Options", value: "DENY" },
  // No adivinar el MIME type (evita ejecutar contenido como script).
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deshabilita APIs sensibles salvo geolocalización (la usa la búsqueda).
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), browsing-topics=()",
  },
  // CSP en report-only. Para activar el bloqueo, cambiar la key a
  // "Content-Security-Policy" tras verificar Maps (ver comentario arriba).
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      // Fotos de trabajos y avatares servidos desde Supabase Storage.
      { protocol: "https", hostname: "*.supabase.co" },
      // Avatares de Google (login / fotos de perfil).
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  experimental: {
    // Server Actions: límite de tamaño para fotos de pedidos / DNI.
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default withSerwist(nextConfig);
