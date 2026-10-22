import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { Briefcase, MessageSquareQuote } from "lucide-react";
import { db } from "@/lib/db";
import {
  profiles,
  providerProfiles,
  providerCategories,
  categories,
  reviews,
} from "@/lib/db/schema";
import { getAspectAverages } from "@/lib/db/queries";
import { AspectBreakdown } from "@/components/shared/aspect-breakdown";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { RatingStars } from "@/components/shared/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://altoque.ar";

/** Nombre del reseñador anonimizado: "Juan Pérez" → "Juan P." (privacidad). */
function maskReviewer(name: string | null): string {
  if (!name) return "Cliente";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "Cliente";
  return `${parts[0]} ${parts[parts.length - 1]!.charAt(0).toUpperCase()}.`;
}

/** Solo profesionales `approved` tienen perfil público; el resto es 404. */
async function getProvider(id: string) {
  if (!z.string().uuid().safeParse(id).success) return null;
  const [prov] = await db
    .select({
      id: providerProfiles.profileId,
      fullName: profiles.fullName,
      avatarUrl: profiles.avatarUrl,
      bio: providerProfiles.bio,
      years: providerProfiles.yearsExperience,
      jobsCompleted: providerProfiles.jobsCompleted,
      ratingAvg: providerProfiles.ratingAvg,
      status: providerProfiles.verificationStatus,
      licenseUrl: providerProfiles.licenseUrl,
    })
    .from(providerProfiles)
    .innerJoin(profiles, eq(profiles.id, providerProfiles.profileId))
    .where(eq(providerProfiles.profileId, id))
    .limit(1);
  if (!prov || prov.status !== "approved") return null;
  return prov;
}

async function getCategories(id: string) {
  return db
    .select({ name: categories.name })
    .from(providerCategories)
    .innerJoin(categories, eq(categories.id, providerCategories.categoryId))
    .where(eq(providerCategories.providerId, id));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const prov = await getProvider(id);
  if (!prov) return { title: "Profesional no encontrado" };

  const name = prov.fullName ?? "Profesional";
  const oficios = (await getCategories(id)).map((c) => c.name).join(", ");
  const title = oficios
    ? `${name} — ${oficios} verificado`
    : `${name} — Profesional verificado`;
  const description =
    prov.bio?.slice(0, 155) ||
    `${name}, ${oficios || "profesional de oficio"} verificado con DNI en AlToque. ${prov.jobsCompleted} trabajos completados.`;

  return {
    title,
    description,
    alternates: { canonical: `${APP_URL}/profesional/${id}` },
    openGraph: {
      title: `${title} · AlToque`,
      description,
      type: "profile",
      images: prov.avatarUrl ? [prov.avatarUrl] : undefined,
    },
  };
}

export default async function ProviderPublicProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prov = await getProvider(id);
  if (!prov) notFound();

  const [cats, reviewList, aspectAverages] = await Promise.all([
    getCategories(id),
    db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        authorName: profiles.fullName,
      })
      .from(reviews)
      .innerJoin(profiles, eq(profiles.id, reviews.authorId))
      .where(eq(reviews.targetId, id))
      .orderBy(desc(reviews.createdAt))
      .limit(20),
    getAspectAverages(id),
  ]);

  const name = prov.fullName ?? "Profesional";
  const initial = name.charAt(0).toUpperCase();
  const ratingValue = Number(prov.ratingAvg);

  // JSON-LD (Person + aggregateRating) para structured data / rich snippets.
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url: `${APP_URL}/profesional/${id}`,
    ...(prov.avatarUrl ? { image: prov.avatarUrl } : {}),
    ...(cats.length ? { jobTitle: cats.map((c) => c.name).join(", ") } : {}),
    ...(prov.bio ? { description: prov.bio } : {}),
    ...(reviewList.length > 0 && ratingValue > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: ratingValue.toFixed(1),
            reviewCount: reviewList.length,
            bestRating: "5",
            worstRating: "1",
          },
        }
      : {}),
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Encabezado del perfil */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
        <div className="flex gap-4">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-heading text-3xl font-bold text-primary">
            {prov.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={prov.avatarUrl}
                alt={name}
                className="size-full object-cover"
              />
            ) : (
              initial
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-bold">{name}</h1>
              <VerifiedBadge label="DNI verificado" />
              {prov.licenseUrl && <VerifiedBadge label="Matrícula verificada" />}
            </div>
            <div className="mt-1">
              <RatingStars
                rating={ratingValue}
                count={reviewList.length}
                size="md"
              />
            </div>
            {aspectAverages.length > 0 && (
              <div className="mt-3 rounded-md border border-border/60 bg-background p-3">
                <AspectBreakdown
                  items={aspectAverages.map((a) => ({
                    aspect: a.aspect,
                    value: a.avg,
                  }))}
                />
              </div>
            )}
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Briefcase className="size-3.5" />
              {prov.jobsCompleted} trabajos completados
              {prov.years ? ` · ${prov.years} años de experiencia` : ""}
            </p>
          </div>
        </div>

        {cats.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {cats.map((c) => (
              <Badge key={c.name} variant="secondary">
                {c.name}
              </Badge>
            ))}
          </div>
        )}

        {prov.bio && (
          <p className="mt-4 text-sm text-muted-foreground">{prov.bio}</p>
        )}

        <Button asChild size="lg" className="mt-5 w-full">
          <Link href={`/pedido/nuevo?providerId=${prov.id}`}>
            Pedir un servicio
          </Link>
        </Button>
      </section>

      {/* Reviews */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-semibold">
          <MessageSquareQuote className="size-5" />
          Reseñas {reviewList.length > 0 && `(${reviewList.length})`}
        </h2>

        {reviewList.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            Todavía no tiene reseñas. Sé el primero en trabajar con él.
          </p>
        ) : (
          <ul className="space-y-3">
            {reviewList.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{maskReviewer(r.authorName)}</span>
                  <RatingStars rating={Number(r.rating)} showCount={false} />
                </div>
                {r.comment && (
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {r.comment}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(r.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
