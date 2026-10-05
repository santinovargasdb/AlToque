"use client";

import { motion, useReducedMotion } from "motion/react";
import { RatingStars } from "./rating-stars";
import { AspectBreakdown } from "./aspect-breakdown";
import { ease } from "@/lib/motion";

/** Reseña ya enviada por el usuario actual sobre un trabajo (solo lectura). */
export function ReviewSummary({
  rating,
  comment,
  aspects,
}: {
  rating: number;
  comment: string | null;
  aspects: { aspect: string; score: number }[];
}) {
  const reduce = useReducedMotion();

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: ease.expo }}
      className="space-y-3 rounded-md border border-border bg-card p-4"
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Tu reseña</p>
      <div className="flex items-center gap-2">
        <RatingStars rating={rating} showCount={false} />
        <span className="font-mono text-xs text-muted-foreground">{rating.toFixed(1)}</span>
      </div>
      <AspectBreakdown items={aspects.map((a) => ({ aspect: a.aspect, value: a.score }))} />
      {comment && <p className="text-sm">{comment}</p>}
    </motion.section>
  );
}
