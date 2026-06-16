import Link from "next/link";
import { MapPin } from "lucide-react";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { RatingStars } from "@/components/shared/rating-stars";
import { Button } from "@/components/ui/button";
import { formatDistance } from "@/lib/utils";
import type { ProviderSearchResult } from "@/lib/db/queries";

/** Resultado de búsqueda. Solo se listan profesionales aprobados. */
export function ProviderCard({ provider }: { provider: ProviderSearchResult }) {
  const initial = (provider.fullName ?? "?").charAt(0).toUpperCase();

  return (
    <article className="flex gap-4 rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-heading text-xl font-bold text-primary">
        {provider.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={provider.avatarUrl}
            alt={provider.fullName ?? "Profesional"}
            className="size-full object-cover"
          />
        ) : (
          initial
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium">
            {provider.fullName ?? "Profesional"}
          </h3>
          <VerifiedBadge label="Verificado" />
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <RatingStars
            rating={provider.ratingAvg}
            count={provider.reviewCount}
          />
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            {formatDistance(provider.distanceKm)}
          </span>
        </div>

        {provider.categories.length > 0 && (
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {provider.categories.join(" · ")}
          </p>
        )}

        <div className="mt-3">
          <Button asChild size="sm" variant="outline">
            <Link href={`/profesional/${provider.id}`}>Ver perfil</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
