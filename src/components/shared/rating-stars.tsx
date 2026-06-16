import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Estrellas de rating. Patrón de confianza: siempre acompañadas de la
 * cantidad de reviews para no engañar con ratings de 1 sola opinión.
 */
export function RatingStars({
  rating,
  count,
  size = "sm",
  showCount = true,
}: {
  rating: number;
  count?: number;
  size?: "sm" | "md";
  showCount?: boolean;
}) {
  const rounded = Math.round(rating * 2) / 2;
  const px = size === "md" ? "size-5" : "size-4";

  return (
    <span className="inline-flex items-center gap-1">
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= Math.floor(rounded);
          const half = !filled && i - 0.5 === rounded;
          return (
            <Star
              key={i}
              className={cn(
                px,
                filled || half
                  ? "fill-warning text-warning"
                  : "fill-transparent text-muted-foreground/40",
              )}
            />
          );
        })}
      </span>
      {showCount && (
        <span className="text-sm text-muted-foreground">
          {count && count > 0
            ? `${rating.toFixed(1)} (${count})`
            : "Sin reseñas"}
        </span>
      )}
    </span>
  );
}
