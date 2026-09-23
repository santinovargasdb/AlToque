import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AlToque: Oficios verificados",
    short_name: "AlToque",
    description:
      "Profesionales de oficios verificados cerca tuyo. Urgencias y trabajos agendados.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7FAF8",
    theme_color: "#4E9B75",
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
