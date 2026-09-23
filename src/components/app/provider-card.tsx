import Link from "next/link";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { RatingStars } from "@/components/shared/rating-stars";
import { Button } from "@/components/ui/button";
import { formatDistance } from "@/lib/utils";
import type { ProviderSearchResult } from "@/lib/db/queries";

/** Ficha de resultado de búsqueda: técnica, nítida y sin sombras difusas */
export function ProviderCard({ provider }: { provider: ProviderSearchResult }) {
  const initial = (provider.fullName ?? "?").charAt(0).toUpperCase();

  return (
    <article className="flex gap-4 rounded-md border border-border bg-card p-4 transition-colors duration-150 hover:border-primary/40">
      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-secondary font-mono text-base font-bold text-foreground">
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
          <h3 className="truncate font-semibold text-sm text-foreground">
            {provider.fullName ?? "Profesional"}
          </h3>
          <VerifiedBadge label="Verificado" />
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <RatingStars
            rating={provider.ratingAvg}
            count={provider.reviewCount}
          />
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="size-3.5 shrink-0"
              aria-hidden="true"
            >
              <path d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.2 4.5 8.5 4.5 8.5s4.5-5.3 4.5-8.5a4.5 4.5 0 0 0-4.5-4.5Z" />
              <circle cx="8" cy="6" r="1.5" />
            </svg>
            <span className="font-mono">{formatDistance(provider.distanceKm)}</span>
          </span>
        </div>

        {provider.categories.length > 0 && (
          <p className="mt-1.5 truncate text-xs text-muted-foreground">
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
