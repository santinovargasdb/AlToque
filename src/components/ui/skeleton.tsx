import { cn } from "@/lib/utils";

/**
 * Bloque "fantasma" pulsante para estados de carga. Se dimensiona con
 * clases (h-*, w-*) espejando el contenido real para que el reemplazo no
 * produzca saltos de layout (CLS ≈ 0).
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-border/60", className)}
      {...props}
    />
  );
}
