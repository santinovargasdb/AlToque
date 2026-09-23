import { cn } from "@/lib/utils";

/**
 * Indicador técnico de puntuación con estrella SVG vectorial.
 * Acompañado de cantidad de reviews auditadas.
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
  const px = size === "md" ? "size-4" : "size-3.5";

  return (
    <span className="inline-flex items-center gap-1.5 select-none">
      <span className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= Math.floor(rounded);
          const half = !filled && i - 0.5 === rounded;
          return (
            <svg
              key={i}
              viewBox="0 0 20 20"
              className={cn(
                px,
                filled || half
                  ? "fill-warning text-warning"
                  : "fill-transparent text-border",
              )}
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="10 2 12.8 7.6 19 8.5 14.5 12.9 15.6 19 10 16.1 4.4 19 5.5 12.9 1 8.5 7.2 7.6 10 2" />
            </svg>
          );
        })}
      </span>
      {showCount && (
        <span className="font-mono text-xs text-muted-foreground">
          {count && count > 0
            ? `${rating.toFixed(1)} (${count})`
            : "Sin calificaciones"}
        </span>
      )}
    </span>
  );
}
