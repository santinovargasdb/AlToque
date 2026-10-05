"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { RatingStars } from "@/components/shared/rating-stars";
import { AspectBreakdown } from "@/components/shared/aspect-breakdown";
import { cn } from "@/lib/utils";

/** Reputación del cliente que ve el profesional: nota general por defecto y un
 * desplegable "Ver detalle" con el desglose por aspecto. */
export function ClientReputation({
  ratingAvg,
  ratingCount,
  aspects,
}: {
  ratingAvg: number;
  ratingCount: number;
  aspects: { aspect: string; value: number }[];
}) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const isNew = ratingCount === 0;

  return (
    <section className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Cliente</p>
          <div className="mt-1">
            {isNew ? (
              <span className="text-sm text-muted-foreground">Nuevo · sin calificaciones</span>
            ) : (
              <RatingStars rating={ratingAvg} count={ratingCount} size="md" />
            )}
          </div>
        </div>
        {!isNew && aspects.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex items-center gap-1 text-sm font-medium text-primary"
          >
            Ver detalle
            <ChevronDown
              className={cn("size-4 transition-transform", open && "rotate-180")}
            />
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-3 border-t border-border/60 pt-3">
              <AspectBreakdown items={aspects} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
