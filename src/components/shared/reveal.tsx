"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type BaseProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Marca `inView` una sola vez cuando el elemento entra en viewport, midiendo su
 * posición en cada `scroll`/`resize` (y al montar). `getBoundingClientRect` es
 * exacto con scroll real o programático. La animación en sí la hace CSS
 * (transiciones), que es más fiable e interrumpible que orquestar variantes JS
 * para un reveal de una sola vez.
 */
function useInViewOnce<T extends HTMLElement>(immediate = false) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (immediate) {
      const id = requestAnimationFrame(() => setInView(true));
      return () => cancelAnimationFrame(id);
    }
    const el = ref.current;
    if (!el) return;
    let done = false;
    const check = () => {
      if (done) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.9 && rect.bottom > 0) {
        done = true;
        setInView(true);
        window.removeEventListener("scroll", check);
        window.removeEventListener("resize", check);
      }
    };
    check();
    if (!done) {
      window.addEventListener("scroll", check, { passive: true });
      window.addEventListener("resize", check);
    }
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [immediate]);

  return { ref, inView };
}

/**
 * Aparición simple (fade + subida con desenfoque mínimo) al entrar en viewport,
 * una sola vez. El estilo `altq-reveal` (en globals.css) sólo aplica cuando el
 * usuario no pidió reducir movimiento; si lo pidió, el contenido queda visible.
 */
export function Reveal({ children, className }: BaseProps) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  return (
    <div ref={ref} className={cn("altq-reveal", inView && "is-in", className)}>
      {children}
    </div>
  );
}

type StaggerProps = BaseProps & {
  /** "inView" (al scrollear, por defecto) o "mount" (al montar, para el hero). */
  mode?: "inView" | "mount";
};

/** Contenedor que escalona la entrada de sus <StaggerItem> vía CSS. */
export function Stagger({ children, className, mode = "inView" }: StaggerProps) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(mode === "mount");
  return (
    <div ref={ref} className={cn("altq-stagger", inView && "is-in", className)}>
      {children}
    </div>
  );
}

/** Ítem individual dentro de <Stagger>. El escalonado lo maneja el contenedor. */
export function StaggerItem({ children, className }: BaseProps) {
  return <div className={className}>{children}</div>;
}
