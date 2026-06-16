import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Badge "Verificado" — patrón de confianza recurrente del producto.
 * Se muestra en perfiles y cards de profesionales aprobados.
 */
export function VerifiedBadge({
  className,
  label = "Verificado",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success",
        className,
      )}
    >
      <BadgeCheck className="size-3.5" />
      {label}
    </span>
  );
}
