import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton de /perfil: espeja título + card de datos de contacto (2 campos
 * + botón) + card de métodos de acceso (2 filas) mientras el server valida
 * la sesión y consulta el perfil (sin CLS).
 */
export default function PerfilLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-20" />
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-4 w-52" />
        <div className="mt-4 space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <Skeleton className="h-10 w-full" />
        </div>
      </section>

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
