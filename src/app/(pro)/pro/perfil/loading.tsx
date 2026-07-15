import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton de /pro/perfil: espeja header + form profesional (chips de
 * oficios, zona/mapa, campos) + card de métodos de acceso mientras el
 * server consulta oficios y perfil (sin CLS).
 */
export default function ProPerfilLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <Skeleton className="size-24 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
      </section>

      <div className="space-y-5 rounded-xl border border-border bg-card p-5">
        <Skeleton className="h-4 w-24" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <Skeleton className="h-5 w-44" />
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-9 w-28" />
          </div>
        ))}
      </section>
    </div>
  );
}
