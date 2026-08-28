import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://altoque.ar";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/inicio",
          "/buscar",
          "/profesional/",
          "/pedido/",
          "/pedidos",
          "/mensajes",
          "/perfil",
          "/pro/",
          "/admin/",
          "/ingresar",
          "/registro",
          "/completar-perfil",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
