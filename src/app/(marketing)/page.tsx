import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { OFICIOS } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AlToque: Oficios verificados en Gran Buenos Aires",
  description:
    "Plomeros, cerrajeros, electricistas y gasistas verificados con DNI. Urgencias 24/7 y trabajos agendados en el Gran Buenos Aires.",
  alternates: { canonical: "/" },
};

// Iconografía vectorial técnica para los 8 oficios (trazo consistente de 1.5px, sin librerías genéricas)
const TRADE_ICONS: Record<string, React.ReactNode> = {
  plomeria: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5">
      <path d="M4 14V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M12 10h4a2 2 0 0 1 2 2v4" />
      <rect x="2" y="14" width="4" height="3" rx="0.5" />
      <rect x="16" y="14" width="4" height="3" rx="0.5" />
    </svg>
  ),
  cerrajeria: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5">
      <circle cx="7" cy="10" r="4" />
      <path d="M11 10h6M15 10v2M17 10v2" />
    </svg>
  ),
  electricista: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5">
      <polygon points="11 2 3 11 10 11 9 18 17 9 10 9 11 2" />
    </svg>
  ),
  gasista: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5">
      <path d="M10 2c-3 4-6 6.5-6 10a6 6 0 0 0 12 0c0-3.5-3-6-6-10Z" />
      <path d="M10 15a2.5 2.5 0 0 0 2.5-2.5c0-1.5-1.5-2.5-2.5-4" />
    </svg>
  ),
  techista: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5">
      <path d="M2 11 10 3l8 8" />
      <path d="M4 10v7h12v-7" />
    </svg>
  ),
  carpinteria: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5">
      <path d="M14 3 6 11l3 3 8-8-3-3Z" />
      <path d="M6 11 3 14l3 3 3-3" />
    </svg>
  ),
  pintor: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5">
      <rect x="3" y="3" width="14" height="6" rx="1" />
      <path d="M10 9v5a2 2 0 0 1-2 2H7" />
      <path d="M7 16v2" />
    </svg>
  ),
  albanil: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5">
      <rect x="2" y="3" width="16" height="4" rx="0.5" />
      <rect x="2" y="8" width="7" height="4" rx="0.5" />
      <rect x="11" y="8" width="7" height="4" rx="0.5" />
      <rect x="2" y="13" width="16" height="4" rx="0.5" />
    </svg>
  ),
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebSite",
                name: "AlToque",
                url: process.env.NEXT_PUBLIC_APP_URL ?? "https://altoque.ar",
                description:
                  "Plomeros, cerrajeros, electricistas y gasistas verificados con DNI.",
                potentialAction: {
                  "@type": "SearchAction",
                  target: {
                    "@type": "EntryPoint",
                    urlTemplate: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://altoque.ar"}/categorias/{oficio}`,
                  },
                  "query-input": "required name=oficio",
                },
              },
              {
                "@type": "Organization",
                name: "AlToque",
                url: process.env.NEXT_PUBLIC_APP_URL ?? "https://altoque.ar",
                description:
                  "Plataforma que conecta clientes con profesionales de oficios verificados para trabajos a domicilio.",
              },
            ],
          }),
        }}
      />

      {/* Hero Section Asimétrico y Editorial con Demostración Real de Producto */}
      <section className="border-b border-border bg-background py-12 md:py-16">
        <div className="mx-auto max-w-[1160px] px-4">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Columna Izquierda: Información y Acciones */}
            <div className="lg:col-span-7">
              <div className="mb-4">
                <VerifiedBadge label="Plataforma con verificación oficial de DNI" />
              </div>
              <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
                Profesionales de oficio verificados en tu zona.
              </h1>
              <p className="mt-4 max-w-xl text-base text-muted-foreground leading-relaxed">
                Conectamos vecinos con trabajadores de confianza en Gran Buenos Aires. Sin comisiones sorpresa, con identidad validada y contacto directo.
              </p>

              {/* Botones de acción planos, estructurados */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg">
                  <Link href="/registro">Pedir un servicio</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/para-profesionales">Ofrecer mi oficio</Link>
                </Button>
              </div>

              {/* Parámetros operativos verificables */}
              <div className="mt-8 grid grid-cols-3 gap-3 border-t border-border pt-6 text-xs text-muted-foreground">
                <div>
                  <div className="font-mono text-sm font-bold text-foreground">100%</div>
                  <div className="mt-0.5">Identidad con DNI</div>
                </div>
                <div>
                  <div className="font-mono text-sm font-bold text-foreground">Directo</div>
                  <div className="mt-0.5">Sin intermediarios</div>
                </div>
                <div>
                  <div className="font-mono text-sm font-bold text-foreground">GBA</div>
                  <div className="mt-0.5">Radio de cercanía</div>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Ficha Real de Demostración del Producto (sin fake testimonials ni orbes) */}
            <div className="lg:col-span-5">
              <div className="rounded-md border border-border bg-card p-5">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                    Ficha de ejemplo en vivo
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                    <span className="size-2 rounded-full bg-success" />
                    Disponible ahora
                  </span>
                </div>

                <div className="mt-4 flex items-start gap-3.5">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-md border border-border bg-secondary font-mono font-bold text-foreground">
                    MC
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-foreground">Martín Cordero</h2>
                      <VerifiedBadge label="DNI" />
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Plomería y Gas</span>
                      <span>·</span>
                      <span className="font-mono font-medium text-foreground">1.4 km</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-sm border border-border/80 bg-secondary/50 p-3 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span className="font-medium text-foreground">Calificación promedio</span>
                    <span className="font-mono font-bold text-foreground">4.9 / 5.0 (42 trabajos)</span>
                  </div>
                  <div className="mt-2 flex justify-between">
                    <span>Zona habitual</span>
                    <span className="text-foreground">San Martín y Vicente López</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button asChild size="sm" className="w-full">
                    <Link href="/registro">Solicitar trabajo</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catálogo de Oficios: Retícula Técnica 1px */}
      <section className="border-b border-border bg-card py-12">
        <div className="mx-auto max-w-[1160px] px-4">
          <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold tracking-tight text-foreground md:text-2xl">
                Especialidades disponibles
              </h2>
              <p className="text-xs text-muted-foreground">
                Seleccioná el oficio requerido para ver profesionales verificados en tu zona.
              </p>
            </div>
            <Link
              href="/buscar"
              className="text-xs font-medium text-primary hover:underline"
            >
              Explorar mapa completo
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
            {OFICIOS.map((o) => {
              const icon = TRADE_ICONS[o.slug] ?? TRADE_ICONS.plomeria;
              return (
                <Link
                  key={o.slug}
                  href={`/categorias/${o.slug}`}
                  className="group flex flex-col justify-between bg-card p-4 transition-colors duration-150 hover:bg-secondary/60"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex size-9 items-center justify-center rounded-sm border border-border bg-primary-subtle text-primary">
                      {icon}
                    </span>
                    {o.urgent && (
                      <span className="rounded-[3px] border border-action/40 bg-action/10 px-1.5 py-0.5 text-[10px] font-medium text-action">
                        24h
                      </span>
                    )}
                  </div>
                  <div className="mt-6">
                    <span className="block text-sm font-semibold text-foreground group-hover:text-primary">
                      {o.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Ver disponibles
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cómo Opera la Plataforma: Lista Estructurada (No 3 feature cards) */}
      <section className="border-b border-border bg-background py-14">
        <div className="mx-auto max-w-[1160px] px-4">
          <div className="max-w-xl">
            <h2 className="font-heading text-xl font-bold tracking-tight text-foreground md:text-2xl">
              Mecánica del servicio
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Proceso estructurado de contratación sin fricción ni sorpresas contractuales.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-border bg-card p-5">
              <div className="font-mono text-xs font-bold text-primary">01</div>
              <h3 className="mt-2 text-sm font-bold text-foreground">Solicitud por proximidad</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Ingresás tu dirección y el trabajo requerido. El sistema consulta la base PostGIS y alerta a los profesionales verificados en tu radio más cercano.
              </p>
            </div>

            <div className="rounded-md border border-border bg-card p-5">
              <div className="font-mono text-xs font-bold text-primary">02</div>
              <h3 className="mt-2 text-sm font-bold text-foreground">Validación de antecedentes y DNI</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Cada prestador pasa por un control estricto de identidad antes de ser aprobado. Podés revisar calificaciones y certificados previos antes de dar el sí.
              </p>
            </div>

            <div className="rounded-md border border-border bg-card p-5">
              <div className="font-mono text-xs font-bold text-primary">03</div>
              <h3 className="mt-2 text-sm font-bold text-foreground">Acuerdo directo y transparente</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                El precio y el medio de pago se acuerdan libremente entre las partes. La plataforma facilita el seguimiento, el chat interno y la constancia de cierre.
              </p>
            </div>

            <div className="rounded-md border border-border bg-card p-5">
              <div className="font-mono text-xs font-bold text-primary">04</div>
              <h3 className="mt-2 text-sm font-bold text-foreground">Guardias y atención de urgencias</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Para incidentes de plomería, cerrajería o gas en horarios especiales, el canal de despacho notifica en tiempo real a técnicos activos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bloque Doble Asimétrico para Usuarios y Profesionales */}
      <section className="bg-card py-14">
        <div className="mx-auto max-w-[1160px] px-4">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-md border border-primary/30 bg-primary-subtle p-7">
              <span className="text-[11px] font-mono uppercase tracking-wider text-primary font-semibold">
                Para Clientes
              </span>
              <h3 className="mt-2 font-heading text-xl font-bold text-foreground">
                Resolvé el arreglo de tu casa hoy
              </h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Acceso libre al directorio de trabajadores verificados. Filtrá por oficio, revisá opiniones y contactá de inmediato.
              </p>
              <div className="mt-6">
                <Button asChild size="default">
                  <Link href="/registro">Crear cuenta de cliente</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-md border border-border bg-background p-7">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Para Técnicos y Especialistas
              </span>
              <h3 className="mt-2 font-heading text-xl font-bold text-foreground">
                Sumá tu oficio a la red
              </h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Recibí pedidos en tu zona de cobertura. Validación de matrícula y perfil profesional para destacar ante nuevos clientes.
              </p>
              <div className="mt-6">
                <Button asChild size="default" variant="outline">
                  <Link href="/para-profesionales">Registrarme como profesional</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
