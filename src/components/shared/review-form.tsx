"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { submitReview } from "@/lib/actions/review";

/** Form de reseña (1–5 estrellas + comentario) para un trabajo completado. */
export function ReviewForm({
  jobId,
  targetId,
  targetLabel,
}: {
  jobId: string;
  targetId: string;
  targetLabel: string;
}) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      toast.error("Elegí una calificación de 1 a 5 estrellas.");
      return;
    }
    startTransition(async () => {
      const res = await submitReview({ jobId, targetId, rating, comment });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("¡Gracias por tu reseña!");
    });
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-md border border-border bg-card p-4"
    >
      <div className="space-y-1.5">
        <Label>¿Cómo fue tu experiencia con {targetLabel}?</Label>
        <div className="flex gap-1" role="radiogroup" aria-label="Calificación">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} de 5 estrellas`}
              onClick={() => setRating(value)}
              onMouseEnter={() => setHovered(value)}
              onMouseLeave={() => setHovered(0)}
              className="p-0.5"
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill={value <= (hovered || rating) ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn(
                  "transition-colors",
                  value <= (hovered || rating)
                    ? "text-amber-400"
                    : "text-border",
                )}
                aria-hidden="true"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="review-comment">Comentario (opcional)</Label>
        <Textarea
          id="review-comment"
          placeholder="Contá cómo fue el trabajo…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending || rating < 1}>
        {pending && (
          <svg
            className="size-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        )}
        Enviar reseña
      </Button>
    </form>
  );
}

