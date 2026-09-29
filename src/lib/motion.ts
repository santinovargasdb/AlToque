import type { Transition, Variants } from "motion/react";

/**
 * Lenguaje físico único de AlToque.
 *
 * Todo el movimiento del producto sale de acá: mismas curvas, mismos resortes,
 * mismas variants. Si algo se tiene que mover, importa de este archivo en vez
 * de inventar timings sueltos — esa consistencia es lo que se lee como "premium"
 * y no como una suma de efectos.
 *
 * Regla de marca: el nombre es "al toque" → las entradas llegan rápido y
 * decididas (ease expo / resortes con poco rebote), nunca lánguidas.
 */

type Bezier = [number, number, number, number];

/** Curvas de aceleración. Preferimos expo-out: arranca decidido, frena suave. */
export const ease: Record<"enter" | "expo" | "move", Bezier> = {
  enter: [0.22, 1, 0.36, 1], // entradas y hover con transform
  expo: [0.16, 1, 0.3, 1], // llegada confiada (foco, reveals)
  move: [0.25, 1, 0.5, 1], // slides, paneles, desplazamientos en pantalla
};

/** Resortes. `snappy` para feedback chico, `smooth` general, `soft` entradas grandes. */
export const spring = {
  snappy: { type: "spring", stiffness: 420, damping: 32, mass: 0.8 },
  smooth: { type: "spring", stiffness: 260, damping: 30 },
  soft: { type: "spring", stiffness: 180, damping: 26 },
} as const satisfies Record<string, Transition>;

/** Duraciones base (segundos) para tweens no-resorte. */
export const duration = {
  fast: 0.16, // feedback inmediato
  base: 0.28, // cambio de estado de rutina
  slow: 0.6, // entrada con autoría
} as const;

/** Fade + subida con un desenfoque mínimo que suaviza la llegada. */
export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: duration.slow, ease: ease.expo },
  },
};

/** Contenedor que escalona a sus hijos (listas, grupos que aparecen juntos). */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

/** Ítem de un `staggerContainer`. Más contenido que `fadeRise`. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: ease.expo },
  },
};

/** Config de viewport para reveals on-scroll: se dispara una sola vez. */
export const viewportOnce = { once: true, amount: 0.3 } as const;
