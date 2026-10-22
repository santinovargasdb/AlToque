import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { OFICIOS } from "@/lib/constants";
import { db } from "@/lib/db";
import { providerProfiles } from "@/lib/db/schema";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://altoque.ar";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
    {
      url: `${BASE}/privacidad`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE}/terminos`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const categorias: MetadataRoute.Sitemap = OFICIOS.map((o) => ({
    url: `${BASE}/categorias/${o.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Perfiles públicos de los profesionales aprobados. Envuelto en try/catch:
  // si la DB no está disponible durante el build, el sitemap igual sale con
  // lo estático en vez de romper el build.
  let profesionales: MetadataRoute.Sitemap = [];
  try {
    const approved = await db
      .select({ id: providerProfiles.profileId })
      .from(providerProfiles)
      .where(eq(providerProfiles.verificationStatus, "approved"));
    profesionales = approved.map((p) => ({
      url: `${BASE}/profesional/${p.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    profesionales = [];
  }

  return [...marketing, ...categorias, ...profesionales];
}
