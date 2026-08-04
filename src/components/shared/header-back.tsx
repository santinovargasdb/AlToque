"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  BackButton,
  recordInAppNavigation,
} from "@/components/shared/back-button";

// Regla centralizada de "volver" para los headers de (app) y (pro): en qué
// rutas se muestra y a dónde caer cuando no hay historial interno. Las rutas
// de la bottom nav no van acá: ahí el botón sería ruido.
// El orden importa: /pedido/nuevo antes que /pedido/[id].
const BACK_ROUTES: Array<{
  pattern: RegExp;
  fallbackHref: string;
  label?: string;
}> = [
  { pattern: /^\/profesional\/[^/]+$/, fallbackHref: "/buscar" },
  { pattern: /^\/pedido\/nuevo$/, fallbackHref: "/inicio" },
  { pattern: /^\/pedido\/[^/]+$/, fallbackHref: "/pedidos" },
  { pattern: /^\/buscar$/, fallbackHref: "/inicio" },
  { pattern: /^\/pro\/pedido\/[^/]+$/, fallbackHref: "/pro/pedidos" },
  { pattern: /^\/pro\/verificacion$/, fallbackHref: "/pro/inicio" },
];

export function HeaderBack() {
  const pathname = usePathname();

  // El layout de zona mantiene montado este componente en todas sus rutas
  // (también en las de bottom nav, donde devuelve null), así que ve cada
  // navegación interna. El primer render es la llegada al documento: no cuenta.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    recordInAppNavigation();
  }, [pathname]);

  const route = BACK_ROUTES.find((r) => r.pattern.test(pathname));
  if (!route) return null;

  // -my-2 absorbe el alto extra del target de 44px sin agrandar el header.
  return (
    <BackButton
      fallbackHref={route.fallbackHref}
      label={route.label}
      className="-my-2 -ml-2"
    />
  );
}
