import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton de /completar-perfil: espeja el heading + 2 campos + botón del
 * form real mientras el server valida la sesión y trae el perfil (sin CLS).
 */
export default function CompletarPerfilLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Cargando">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
}
