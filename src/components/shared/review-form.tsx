"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";
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
      className="space-y-3 rounded-xl border border-border bg-card p-4"
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
              <Star
                className={cn(
                  "size-7 transition-colors",
                  value <= (hovered || rating)
                    ? "fill-warning text-warning"
                    : "text-border",
                )}
              />
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
        {pending && <Loader2 className="size-4 animate-spin" />}
        Enviar reseña
      </Button>
    </form>
  );
}
