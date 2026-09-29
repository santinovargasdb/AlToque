"use client";

import Link from "next/link";
import type { PointerEvent } from "react";
import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import { spring } from "@/lib/motion";
import { TradeIcon } from "./trade-icon";

type OficioCardProps = {
  slug: string;
  name: string;
  urgent?: boolean;
};

/**
 * Card de oficio con "spotlight" que sigue al cursor (estilo Magic Card) y
 * elevación con resorte al hover. El brillo usa el azul de marca a baja
 * opacidad —realce de foco, no decoración—. En touch no hay hover: queda el
 * feedback táctil del `whileTap`.
 */
export function OficioCard({ slug, name, urgent }: OficioCardProps) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const spotlight = useMotionTemplate`radial-gradient(200px circle at ${mx}px ${my}px, color-mix(in srgb, var(--primary) 16%, transparent), transparent 72%)`;

  function handleMove(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
  }

  return (
    <Link href={`/categorias/${slug}`} className="group block">
      <motion.div
        onPointerMove={handleMove}
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.98 }}
        transition={spring.smooth}
        className="relative overflow-hidden rounded-xl border border-border bg-card p-4 group-hover:border-primary/40 group-hover:[box-shadow:var(--shadow-card)] md:p-5"
      >
        {/* Spotlight (debajo del contenido) */}
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: spotlight }}
        />

        <div className="relative">
          <div className="flex items-start justify-between">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary-subtle text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
              <TradeIcon slug={slug} className="size-5" />
            </span>
            {urgent && (
              <span className="rounded-md bg-action-subtle px-1.5 py-0.5 font-mono text-[10px] font-bold text-action">
                24h
              </span>
            )}
          </div>
          <p className="mt-5 font-heading text-sm font-bold text-foreground group-hover:text-primary">
            {name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ver quién está cerca
          </p>
        </div>
      </motion.div>
    </Link>
  );
}
