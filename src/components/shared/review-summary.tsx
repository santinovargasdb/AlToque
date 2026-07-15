import { RatingStars } from "./rating-stars";

/** Reseña ya enviada por el usuario actual sobre un trabajo (solo lectura). */
export function ReviewSummary({
  rating,
  comment,
}: {
  rating: number;
  comment: string | null;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        Tu reseña
      </p>
      <div className="mt-2">
        <RatingStars rating={rating} showCount={false} />
      </div>
      {comment && <p className="mt-2 text-sm">{comment}</p>}
    </section>
  );
}
