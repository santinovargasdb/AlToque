import { MapPin, Star, Zap, ShieldCheck, Camera } from "lucide-react";

/**
 * Mockup de celular en CSS puro mostrando la pantalla real del profesional:
 * un pedido urgente entrando por el despacho en tiempo real. Es el elemento
 * firma del hero: producto de verdad, no ilustración genérica.
 */
export function PhoneDemo() {
  return (
    <div className="relative mx-auto w-fit">
      {/* Chispa AlToque de fondo (motivo del logo, marca de agua) */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
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
      <div className="w-[280px] rounded-[2.4rem] border border-slate-700/60 bg-slate-900 p-2 [box-shadow:var(--shadow-float)] sm:w-[300px]">
        <div className="relative overflow-hidden rounded-[1.9rem] bg-background">
          {/* Barra de estado + isla */}
          <div className="flex items-center justify-between px-5 pt-3">
            <span className="font-mono text-[10px] font-bold text-foreground">
              21:37
            </span>
            <span className="h-5 w-16 rounded-full bg-slate-900" />
            <span className="font-mono text-[10px] text-muted-foreground">4G</span>
          </div>

          {/* Header de la app del profesional */}
          <div className="flex items-center justify-between px-4 pb-3 pt-4">
            <div>
              <p className="text-[11px] text-muted-foreground">Hola, Rodrigo</p>
              <p className="font-heading text-sm font-bold text-foreground">
                Tu guardia de hoy
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2 py-1 text-[10px] font-semibold text-success">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full rounded-full bg-success animate-live-ping" />
                <span className="relative inline-flex size-1.5 rounded-full bg-success" />
              </span>
              En línea
            </span>
          </div>

          {/* Pedido urgente entrante */}
          <div className="mx-3 rounded-xl border border-action/30 bg-card p-3 [box-shadow:var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-md bg-action px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-action-foreground">
                <Zap className="size-2.5" /> Urgente
              </span>
              <span className="font-mono text-[10px] font-bold text-action">
                Vence en 9:47
              </span>
            </div>

            <p className="mt-2.5 font-heading text-[13px] font-bold leading-snug text-foreground">
              Pérdida de agua abajo de la mesada
            </p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              Plomería
              <span className="size-0.5 rounded-full bg-muted-foreground" />
              <MapPin className="size-3" /> Villa Ballester, a 1,2 km
            </p>

            <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-secondary p-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-subtle font-mono text-[10px] font-bold text-primary">
                MG
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-foreground">
                  Marta G.
                </p>
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Star className="size-2.5 fill-warning text-warning" /> 4,8 como
                  clienta
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-1.5 py-0.5 text-[9px] text-muted-foreground">
                <Camera className="size-2.5" /> 2 fotos
              </span>
            </div>

            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <span className="inline-flex h-8 items-center justify-center rounded-lg bg-action text-[11px] font-bold text-action-foreground">
                Aceptar el trabajo
              </span>
              <span className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-3 text-[11px] font-medium text-muted-foreground">
                Ahora no
              </span>
            </div>
          </div>

          {/* Resumen de la semana */}
          <div className="mx-3 mb-4 mt-2.5 flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
            <div>
              <p className="text-[10px] text-muted-foreground">Tu semana</p>
              <p className="font-mono text-[12px] font-bold text-foreground">
                6 trabajos cerrados
              </p>
            </div>
            <span className="inline-flex items-center gap-1 font-mono text-[12px] font-bold text-foreground">
              <Star className="size-3 fill-warning text-warning" /> 4,9
            </span>
          </div>
        </div>
      </div>

      {/* Tarjeta flotante: notificación push */}
      <div className="absolute -left-20 top-5 hidden w-44 rounded-xl border border-border bg-card/95 p-2.5 backdrop-blur [box-shadow:var(--shadow-card)] md:block">
        <div className="flex items-start gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-action-subtle text-action">
            <Zap className="size-3.5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold leading-tight text-foreground">
              Nuevo pedido urgente
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Plomería · a 1,2 km tuyo
            </p>
          </div>
        </div>
      </div>

      {/* Tarjeta flotante: identidad verificada */}
      <div className="absolute -right-12 -bottom-3 hidden w-44 rounded-xl border border-border bg-card/95 p-2.5 backdrop-blur [box-shadow:var(--shadow-card)] md:block">
        <div className="flex items-start gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
            <ShieldCheck className="size-3.5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold leading-tight text-foreground">
              Rodrigo M. · DNI verificado
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              ★ 4,9 · 132 trabajos en la app
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
