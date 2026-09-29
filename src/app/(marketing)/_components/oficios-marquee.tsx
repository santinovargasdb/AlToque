"use client";

import { useRef } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { OFICIOS } from "@/lib/constants";
import { TradeIcon } from "./trade-icon";

/** Envuelve un valor en [min, max) para un loop sin saltos. */
function wrap(min: number, max: number, v: number) {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
}

function MarqueeTrack({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div
      className="flex shrink-0 items-center"
      aria-hidden={ariaHidden || undefined}
    >
      {OFICIOS.map((o) => (
        <span
          key={o.slug}
          className="mx-5 inline-flex items-center gap-2.5 text-sm font-medium text-muted-foreground"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary-subtle text-primary">
            <TradeIcon slug={o.slug} className="size-4" />
          </span>
          {o.name}
          {o.urgent && (
            <span className="rounded-md bg-action-subtle px-1.5 py-0.5 font-mono text-[10px] font-bold text-action">
              24h
            </span>
          )}
          <span className="ml-5 size-1 rounded-full bg-border" />
        </span>
      ))}
    </div>
  );
}

/**
 * Banda de oficios cuya deriva base es lenta pero cuya velocidad y dirección
 * reaccionan a tu scroll (estilo scroll-based velocity de Magic UI): scrolleás
 * para abajo y acelera en un sentido; para arriba, se invierte. La pista se
 * duplica y se envuelve al 50%, así el loop cierra sin saltos. Con movimiento
 * reducido queda quieta.
 */
export function OficiosMarquee() {
  const reduce = useReducedMotion();
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400,
  });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 4], {
    clamp: false,
  });
  const directionFactor = useRef(1);

  // Deriva base en %/s (negativo = hacia la izquierda).
  const baseVelocity = -1.4;
  const x = useTransform(baseX, (v) => `${wrap(-50, 0, v)}%`);

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);
    if (velocityFactor.get() < 0) directionFactor.current = -1;
    else if (velocityFactor.get() > 0) directionFactor.current = 1;
    moveBy += directionFactor.current * moveBy * velocityFactor.get();
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div className="overflow-hidden border-y border-border bg-card py-3.5">
      <motion.div className="flex w-max" style={{ x }}>
        <MarqueeTrack />
        <MarqueeTrack ariaHidden />
      </motion.div>
    </div>
  );
}
