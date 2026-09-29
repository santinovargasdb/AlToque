"use client";

import { useState, useTransition } from "react";
import { motion, useAnimate, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ease, spring } from "@/lib/motion";
import { submitReview } from "@/lib/actions/review";

const RATING_LABELS = ["", "Muy malo", "Malo", "Regular", "Muy bueno", "Excelente"];

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
  const reduce = useReducedMotion();
  const [scope, animate] = useAnimate();

  const shown = hovered || rating;

  function pick(value: number) {
    setRating(value);
    if (reduce) return;
    // "Peek": las estrellas elegidas hacen pop en secuencia, de izq. a der.
    for (let i = 1; i <= value; i++) {
      animate(
        `[data-star="${i}"]`,
        { scale: [1, 1.32, 1] },
        { duration: 0.3, delay: (i - 1) * 0.05, ease: ease.expo },
      );
    }
  }

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
        <div
          ref={scope}
          className="flex items-center gap-1"
          role="radiogroup"
          aria-label="Calificación"
        >
          {[1, 2, 3, 4, 5].map((value) => {
            const active = value <= shown;
            return (
              <motion.button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} de 5 estrellas`}
                onClick={() => pick(value)}
                onMouseEnter={() => setHovered(value)}
                onMouseLeave={() => setHovered(0)}
                className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                whileHover={reduce ? undefined : { scale: 1.18 }}
                whileTap={reduce ? undefined : { scale: 0.85 }}
                transition={spring.snappy}
              >
                <svg
                  data-star={value}
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill={active ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(
                    "transition-colors duration-150",
                    active ? "text-warning" : "text-border",
                  )}
                  aria-hidden="true"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </motion.button>
            );
          })}
          <motion.span
            key={shown}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: ease.enter }}
            className="ml-2 text-sm font-semibold text-warning"
          >
            {shown > 0 ? RATING_LABELS[shown] : ""}
          </motion.span>
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
