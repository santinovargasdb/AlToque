"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";

type WordRotateProps = {
  words: string[];
  className?: string;
  /** ms entre palabras */
  interval?: number;
};

/**
 * Rota una palabra en su lugar (fade + slide vertical). Un "fantasma" invisible
 * con la palabra más larga fija el ancho, así el texto que sigue no salta al
 * cambiar. Con `prefers-reduced-motion` muestra la primera y no rota.
 */
export function WordRotate({ words, className, interval = 2200 }: WordRotateProps) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), "");

  useEffect(() => {
    if (reduce || words.length < 2) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % words.length),
      interval,
    );
    return () => clearInterval(id);
  }, [words.length, interval, reduce]);

  if (reduce) return <span className={className}>{words[0]}</span>;

  return (
    <span className="relative inline-flex whitespace-nowrap align-bottom">
      {/* fantasma: fija el ancho al de la palabra más larga */}
      <span className={cn("invisible", className)} aria-hidden="true">
        {longest}
      </span>
      <span className="absolute inset-0 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={index}
            className={cn("inline-block", className)}
            initial={{ y: "0.4em", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-0.4em", opacity: 0 }}
            transition={{ duration: 0.3, ease: ease.expo }}
          >
            {words[index]}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}
