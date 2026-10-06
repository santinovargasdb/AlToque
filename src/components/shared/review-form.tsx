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
import { aspectsFor, type ReviewDirection } from "@/lib/reviews/aspects";

/** Form de reseña por aspectos (4 × 1–5 estrellas + comentario) de un trabajo
 * completado. El set de aspectos depende de la dirección. */
export function ReviewForm({
  jobId,
  targetId,
  targetLabel,
  direction,
}: {
  jobId: string;
  targetId: string;
  targetLabel: string;
  direction: ReviewDirection;
}) {
  const aspects = aspectsFor(direction);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();
  const reduce = useReducedMotion();
  const [scope, animate] = useAnimate();

  const allScored = aspects.every((a) => (scores[a.key] ?? 0) >= 1);

  function pick(key: string, value: number) {
    setScores((prev) => ({ ...prev, [key]: value }));
    if (reduce) return;
    for (let i = 1; i <= value; i++) {
      animate(
        `[data-star="${key}-${i}"]`,
        { scale: [1, 1.32, 1] },
        { duration: 0.3, delay: (i - 1) * 0.05, ease: ease.expo },
      );
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!allScored) {
      toast.error("Calificá los 4 aspectos.");
      return;
    }
    startTransition(async () => {
      const res = await submitReview({ jobId, targetId, aspects: scores, comment });
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
      ref={scope}
      className="space-y-4 rounded-md border border-border bg-card p-4"
    >
      <p className="text-sm font-medium">¿Cómo fue tu experiencia con {targetLabel}?</p>

      <div className="space-y-3">
        {aspects.map((a) => {
          const current = scores[a.key] ?? 0;
          return (
            <div key={a.key} className="flex items-center justify-between gap-3">
              <Label className="min-w-0 text-sm text-muted-foreground">{a.label}</Label>
              <div
                className="flex shrink-0 items-center gap-1"
                role="radiogroup"
                aria-label={a.label}
              >
                {[1, 2, 3, 4, 5].map((value) => {
                  const active = value <= current;
                  return (
                    <motion.button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={current === value}
                      aria-label={`${a.label}: ${value} de 5`}
                      onClick={() => pick(a.key, value)}
                      className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      whileHover={reduce ? undefined : { scale: 1.18 }}
                      whileTap={reduce ? undefined : { scale: 0.85 }}
                      transition={spring.snappy}
                    >
                      <svg
                        data-star={`${a.key}-${value}`}
                        width="26"
                        height="26"
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
              </div>
            </div>
          );
        })}
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

      <Button type="submit" className="w-full" disabled={pending || !allScored}>
        {pending && (
          <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
        Enviar reseña
      </Button>
    </form>
  );
}
