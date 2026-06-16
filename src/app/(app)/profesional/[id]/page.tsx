import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { Briefcase, MessageSquareQuote } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  profiles,
  providerProfiles,
  providerCategories,
  categories,
  reviews,
} from "@/lib/db/schema";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { RatingStars } from "@/components/shared/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export default async function ProviderPublicProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("client");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

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
    })
    .from(providerProfiles)
    .innerJoin(profiles, eq(profiles.id, providerProfiles.profileId))
    .where(eq(providerProfiles.profileId, id))
    .limit(1);

  // Solo profesionales aprobados tienen perfil público.
  if (!prov || prov.status !== "approved") notFound();

  const [cats, reviewList] = await Promise.all([
    db
      .select({ name: categories.name })
      .from(providerCategories)
      .innerJoin(categories, eq(categories.id, providerCategories.categoryId))
      .where(eq(providerCategories.providerId, id)),
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
  ]);

  const initial = (prov.fullName ?? "?").charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Encabezado del perfil */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
        <div className="flex gap-4">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-heading text-3xl font-bold text-primary">
            {prov.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={prov.avatarUrl}
                alt={prov.fullName ?? "Profesional"}
                className="size-full object-cover"
              />
            ) : (
              initial
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-bold">
                {prov.fullName ?? "Profesional"}
              </h1>
              <VerifiedBadge />
            </div>
            <div className="mt-1">
              <RatingStars
                rating={Number(prov.ratingAvg)}
                count={reviewList.length}
                size="md"
              />
            </div>
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
                  <span className="font-medium">
                    {r.authorName ?? "Cliente"}
                  </span>
                  <RatingStars rating={r.rating} showCount={false} />
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
