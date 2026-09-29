"use client";

import { motion, useReducedMotion } from "motion/react";
import { RatingStars } from "./rating-stars";
import { ease } from "@/lib/motion";

/** Reseña ya enviada por el usuario actual sobre un trabajo (solo lectura). */
export function ReviewSummary({
  rating,
  comment,
}: {
  rating: number;
  comment: string | null;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: ease.expo }}
      className="rounded-md border border-border bg-card p-4"
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        Tu reseña
      </p>
      <div className="mt-2">
        <RatingStars rating={rating} showCount={false} />
      </div>
      {comment && <p className="mt-2 text-sm">{comment}</p>}
    </motion.section>
  );
}
