import { cn } from "@/lib/utils";

/**
 * Badge de verificación de identidad oficial (DNI / Matrícula).
 * Diseño técnico sobrio: borde nítido, sin redondez de píldora ni iconos genéricos.
 */
export function VerifiedBadge({
  className,
  label = "DNI Verificado",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success select-none",
        className,
      )}
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-3 shrink-0"
        aria-hidden="true"
      >
        <path d="M2.5 8.5 6 12l7.5-8" />
      </svg>
      <span>{label}</span>
    </span>
  );
}
