import { aspectLabel } from "@/lib/reviews/aspects";
import { RatingStars } from "./rating-stars";

/** Lista compacta de aspectos con su puntaje (una reseña) o promedio (agregado).
 * Reusada en el perfil del pro y en el desplegable de reputación del cliente. */
export function AspectBreakdown({
  items,
}: {
  items: { aspect: string; value: number }[];
}) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {items.map((it) => (
        <li
          key={it.aspect}
          className="flex items-center justify-between gap-3 text-sm"
        >
          <span className="text-muted-foreground">{aspectLabel(it.aspect)}</span>
          <span className="flex items-center gap-1.5">
            <RatingStars rating={it.value} showCount={false} />
            <span className="font-mono text-xs text-muted-foreground">
              {it.value.toFixed(1)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
