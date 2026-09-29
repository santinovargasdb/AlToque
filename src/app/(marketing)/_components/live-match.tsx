"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from "motion/react";
import {
  Camera,
  ClipboardList,
  Home,
  MapPin,
  Search,
  Star,
  User,
  Zap,
} from "lucide-react";
import { ease, spring } from "@/lib/motion";
import { WordRotate } from "./word-rotate";

/** Problemas de plomería que rotan en el header (consistentes con el match). */
const PROBLEMAS = [
  "Pérdida de agua",
  "Caño que gotea",
  "Canilla rota",
  "Cloaca tapada",
];

/** Pines del radar: uno es el match (destacado). */
const PINS = [
  { left: "24%", top: "30%", match: false },
  { left: "68%", top: "24%", match: false },
  { left: "52%", top: "62%", match: true },
  { left: "80%", top: "58%", match: false },
];

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.96, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      ...spring.smooth,
      staggerChildren: 0.09,
      delayChildren: 0.22,
    },
  },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: ease.expo } },
};

const starsRowVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.06 },
  },
};

const starVariants: Variants = {
  hidden: { opacity: 0, scale: 0.4, y: 2 },
  show: { opacity: 1, scale: 1, y: 0, transition: spring.snappy },
};

const checkVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  show: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.45, ease: ease.enter, delay: 0.18 },
  },
};

/**
 * Elemento firma del hero: la app buscando y encontrando un profesional
 * verificado cerca tuyo, en vivo. No es una ilustración: es el producto
 * demostrando su promesa —el match, al toque—. Loopea, pausa fuera de
 * pantalla y respeta `prefers-reduced-motion`.
 */
export function LiveMatch() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const reduce = useReducedMotion();
  const active = inView && !reduce;

  const [started, setStarted] = useState(false);
  const [searching, setSearching] = useState(true);

  // Dispara la resolución del match la primera vez que entra en pantalla.
  useEffect(() => {
    if (active && !started) setStarted(true);
  }, [active, started]);

  // "Buscando…" al arrancar; una vez resuelto queda "1 verificado cerca".
  useEffect(() => {
    if (!started) return;
    const t = setTimeout(() => setSearching(false), 1050);
    return () => clearTimeout(t);
  }, [started]);

  return (
    <div ref={ref} className="relative mx-auto w-fit">
      {/* Chispa AlToque de fondo (motivo del logo, marca de agua) */}
      <svg
        viewBox="0 0 24 24"
        className="absolute -right-10 -top-12 -z-10 size-64 rotate-12 text-primary/10"
        aria-hidden="true"
      >
        <polygon
          points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
          fill="currentColor"
          fillOpacity="0.35"
        />
      </svg>

      {/* Marco del teléfono */}
      <div className="relative w-[288px] rounded-[2.4rem] border border-slate-700/60 bg-slate-900 p-2 ring-1 ring-inset ring-white/5 [box-shadow:var(--shadow-float)] sm:w-[308px]">
        {/* Botones físicos laterales (realismo iPhone) */}
        <span
          aria-hidden="true"
          className="absolute -left-[3px] top-[86px] h-7 w-[3px] rounded-l bg-slate-700"
        />
        <span
          aria-hidden="true"
          className="absolute -left-[3px] top-[124px] h-11 w-[3px] rounded-l bg-slate-700"
        />
        <span
          aria-hidden="true"
          className="absolute -left-[3px] top-[176px] h-11 w-[3px] rounded-l bg-slate-700"
        />
        <span
          aria-hidden="true"
          className="absolute -right-[3px] top-[150px] h-16 w-[3px] rounded-r bg-slate-700"
        />
        <div className="relative flex min-h-[500px] flex-col overflow-hidden rounded-[1.9rem] bg-background">
          {/* Reflejo sutil de pantalla */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-white/[0.06] to-transparent"
          />
          {/* Barra de estado */}
          <div className="flex items-center justify-between px-5 pt-3">
            <span className="font-mono text-[10px] font-bold text-foreground">
              21:37
            </span>
            <span className="h-5 w-16 rounded-full bg-slate-900" />
            <span className="font-mono text-[10px] text-muted-foreground">
              4G
            </span>
          </div>

          {/* Header: pedido + estado en vivo */}
          <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-4">
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Tu pedido</p>
              <p className="font-heading text-sm font-bold text-foreground">
                <WordRotate words={PROBLEMAS} interval={2600} />
              </p>
            </div>
            <div className="inline-flex h-6 items-center gap-1.5 rounded-full border border-primary/25 bg-primary-subtle px-2 text-[10px] font-semibold text-primary">
              <span className="relative flex size-1.5">
                {active && (
                  <motion.span
                    className="absolute inline-flex size-full rounded-full bg-primary"
                    animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                    transition={{
                      duration: 1.6,
                      ease: "easeOut",
                      repeat: Infinity,
                    }}
                  />
                )}
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={searching ? "buscando" : "cerca"}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: ease.enter }}
                >
                  {searching ? "Buscando…" : "1 verificado cerca"}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>

          {/* Radar de cercanía (ambiente) */}
          <div className="relative mx-3 h-28 overflow-hidden rounded-xl border border-border bg-secondary/60">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/30"
                  animate={
                    active
                      ? { scale: [1, 2.6], opacity: [0.5, 0] }
                      : { scale: 1.6, opacity: 0.18 }
                  }
                  transition={
                    active
                      ? {
                          duration: 2.4,
                          ease: "easeOut",
                          repeat: Infinity,
                          delay: i * 0.8,
                        }
                      : { duration: 0 }
                  }
                />
              ))}
              {/* Barrido */}
              <motion.span
                className="absolute left-1/2 top-1/2 h-px w-14 origin-left -translate-y-1/2 bg-gradient-to-r from-primary/70 to-transparent"
                animate={active ? { rotate: 360 } : { rotate: 0 }}
                transition={
                  active
                    ? { duration: 3.4, ease: "linear", repeat: Infinity }
                    : { duration: 0 }
                }
              />
              {/* Vos */}
              <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-4 ring-primary/15" />
            </div>

            {/* Pines de profesionales */}
            {PINS.map((pin, i) => (
              <motion.span
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: pin.left, top: pin.top }}
                animate={active ? { y: [0, -2.5, 0] } : { y: 0 }}
                transition={
                  active
                    ? {
                        duration: 2.6,
                        ease: "easeInOut",
                        repeat: Infinity,
                        delay: i * 0.4,
                      }
                    : { duration: 0 }
                }
              >
                <span
                  className={
                    pin.match
                      ? "relative flex size-3 items-center justify-center rounded-full bg-action text-action-foreground ring-4 ring-action/20"
                      : "block size-2 rounded-full bg-primary/40"
                  }
                >
                  {pin.match && active && (
                    <motion.span
                      className="absolute inset-0 rounded-full bg-action"
                      animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                      transition={{
                        duration: 1.8,
                        ease: "easeOut",
                        repeat: Infinity,
                      }}
                    />
                  )}
                </span>
              </motion.span>
            ))}
          </div>

          {/* Card del profesional encontrado */}
          <motion.div
            className="mx-3 mt-2.5 rounded-xl border border-border bg-card p-3 [box-shadow:var(--shadow-card)]"
            variants={cardVariants}
            initial={reduce ? false : "hidden"}
            animate={reduce || started ? "show" : "hidden"}
          >
            <motion.div
              variants={rowVariants}
              className="flex items-center gap-2.5"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle font-mono text-[11px] font-bold text-primary">
                MC
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-foreground">
                  Martín Cordero
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Plomería y Gas
                </p>
              </div>
              {/* Badge DNI verificado con check que se dibuja */}
              <span className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-1.5 py-1 text-[9px] font-semibold text-success">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="size-3"
                  aria-hidden="true"
                >
                  <motion.path
                    d="M20 6 9 17l-5-5"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    variants={checkVariants}
                  />
                </svg>
                DNI
              </span>
            </motion.div>

            <motion.p
              variants={rowVariants}
              className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground"
            >
              <MapPin className="size-3 text-primary" /> A 1,4 km · San Martín
              <span className="size-0.5 rounded-full bg-muted-foreground" />
              <Camera className="size-3" /> 2 fotos
            </motion.p>

            <motion.div
              variants={starsRowVariants}
              className="mt-2.5 flex items-center gap-2"
            >
              <span className="flex items-center gap-0.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.span key={i} variants={starVariants}>
                    <Star className="size-3.5 fill-warning text-warning" />
                  </motion.span>
                ))}
              </span>
              <span className="font-mono text-[11px] font-bold text-foreground">
                4,9
              </span>
              <span className="text-[10px] text-muted-foreground">
                42 trabajos
              </span>
            </motion.div>

            <motion.div
              variants={rowVariants}
              className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-action text-[11px] font-bold text-action-foreground"
            >
              <Zap className="size-3.5" /> Conectá al toque
            </motion.div>
          </motion.div>

          {/* Seguimiento del pedido (el después del match) */}
          <div className="mx-3 mt-2 flex items-center gap-2 rounded-lg bg-secondary/60 px-2.5 py-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
              <MapPin className="size-3" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold text-foreground">
                Martín está en camino
              </p>
              <p className="text-[9px] text-muted-foreground">
                Llega en ~15 min
              </p>
            </div>
            <span className="font-mono text-[10px] font-bold text-primary">
              1,4 km
            </span>
          </div>

          {/* Barra de navegación + indicador home */}
          <div className="mt-auto">
            <div className="flex items-center justify-around border-t border-border px-6 pt-3">
              <Home className="size-[18px] text-primary" />
              <Search className="size-[18px] text-muted-foreground" />
              <ClipboardList className="size-[18px] text-muted-foreground" />
              <User className="size-[18px] text-muted-foreground" />
            </div>
            <div className="flex justify-center pb-2 pt-2.5">
              <span className="h-1 w-24 rounded-full bg-foreground/25" />
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta flotante: push (desktop) */}
      <motion.div
        className="absolute -left-16 top-32 hidden w-44 rounded-xl border border-border bg-card/95 p-2.5 backdrop-blur [box-shadow:var(--shadow-card)] lg:block"
        animate={active ? { y: [0, -6, 0] } : { y: 0 }}
        transition={
          active
            ? { duration: 4.5, ease: "easeInOut", repeat: Infinity }
            : { duration: 0 }
        }
      >
        <div className="flex items-start gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-action-subtle text-action">
            <Zap className="size-3.5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold leading-tight text-foreground">
              Profesional en camino
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Te escribió · a 1,4 km
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tarjeta flotante: reseña real (desktop), abajo-izquierda del teléfono */}
      <motion.div
        className="absolute -left-16 bottom-3 hidden w-48 rounded-xl border border-border bg-card/95 p-2.5 backdrop-blur [box-shadow:var(--shadow-card)] lg:block"
        animate={active ? { y: [0, 6, 0] } : { y: 0 }}
        transition={
          active
            ? { duration: 5, ease: "easeInOut", repeat: Infinity, delay: 0.6 }
            : { duration: 0 }
        }
      >
        <div className="flex items-start gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-warning/10 text-warning">
            <Star className="size-3.5 fill-warning" />
          </span>
          <div>
            <p className="text-[11px] font-semibold leading-tight text-foreground">
              “Vino en 40 min y lo resolvió”
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Marta G. · Villa Ballester
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
