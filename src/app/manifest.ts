import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AlToque: Oficios verificados",
    short_name: "AlToque",
    description:
      "Profesionales de oficios verificados cerca tuyo. Urgencias y trabajos agendados.",
    id: "/",
    // /inicio manda a cada uno a su home según el rol (o a /ingresar sin
    // sesión): la app instalada no abre en la landing.
    start_url: "/inicio",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F8FAFC",
    theme_color: "#2563EB",
    lang: "es-AR",
    categories: ["business", "utilities", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
