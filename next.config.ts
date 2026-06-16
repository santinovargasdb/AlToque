import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  // Service worker fuente y destino (PWA: push + offline básico)
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Desactivar SW en desarrollo evita cachear cambios durante el dev loop.
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
