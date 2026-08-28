import type { MetadataRoute } from "next";
import { OFICIOS } from "@/lib/constants";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://altoque.ar";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const marketing: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    {
      url: `${BASE}/como-funciona`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE}/para-profesionales`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  const categorias: MetadataRoute.Sitemap = OFICIOS.map((o) => ({
    url: `${BASE}/categorias/${o.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...marketing, ...categorias];
}
