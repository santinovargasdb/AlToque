"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// Contador de navegaciones SPA de ESTA carga del documento (module scope a
// propósito: una navegación completa —volver de Mercado Pago por back_urls,
// abrir un push, pegar la URL— lo resetea). history.length no sirve acá: al
// volver de MP el historial existe pero back() caería en el checkout.
let inAppNavigations = 0;

/** Lo llama el tracker de ruta del header (HeaderBack) en cada cambio de pathname. */
export function recordInAppNavigation() {
  inAppNavigations += 1;
}

export function BackButton({
  fallbackHref,
  label = "Volver",
  className,
}: {
  fallbackHref: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        if (inAppNavigations > 0) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <ArrowLeft className="size-5" />
    </button>
  );
}
