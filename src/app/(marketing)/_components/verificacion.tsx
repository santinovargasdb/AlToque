import { ShieldCheck, IdCard, Star } from "lucide-react";
import { VerifiedBadge } from "@/components/shared/verified-badge";

const CONTROLES = [
  {
    icon: IdCard,
    titulo: "DNI y selfie antes de entrar",
    detalle:
      "Nadie publica su perfil sin validar su identidad con documento y foto. Lo revisamos uno por uno, no es un checkbox.",
  },
  {
    icon: ShieldCheck,
    titulo: "Matrícula cuando el oficio lo exige",
    detalle:
      "Para gas y electricidad pedimos credenciales habilitantes. Con esos trabajos no se juega.",
  },
  {
    icon: Star,
    titulo: "Reseñas que no se pueden inventar",
    detalle:
      "Solo puede calificar quien contrató por la app y el trabajo se cerró. Cada estrella tiene un trabajo real atrás.",
  },
] as const;

export function Verificacion() {
  return (
    <section className="border-y border-border bg-card py-16">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 lg:grid-cols-2">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Personas verificadas, no perfiles anónimos
          </h2>
          <p className="mt-3 max-w-lg text-muted-foreground">
            Le abrís la puerta de tu casa a alguien que no conocés. Por eso la
            verificación no es una promesa: es la entrada a la plataforma.
          </p>

          <ul className="mt-8 space-y-6">
            {CONTROLES.map((c) => (
              <li key={c.titulo} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                  <c.icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-heading text-base font-bold text-foreground">
                    {c.titulo}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {c.detalle}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Credencial del profesional: cómo se ve un perfil aprobado */}
        <div className="mx-auto w-full max-w-sm">
          <div className="rounded-2xl border border-border bg-background p-6 [box-shadow:var(--shadow-card)]">
            <div className="flex items-center justify-between border-b border-dashed border-border pb-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Credencial AlToque
              </span>
              <span className="inline-flex size-2.5 rounded-full bg-success" />
            </div>

            <div className="mt-5 flex items-center gap-4">
              <span className="flex size-14 items-center justify-center rounded-full bg-primary-subtle font-heading text-lg font-bold text-primary">
                RM
              </span>
              <div>
                <p className="font-heading text-lg font-bold text-foreground">
                  Rodrigo Medina
                </p>
                <p className="text-sm text-muted-foreground">
                  Plomería · Gasista
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <VerifiedBadge label="DNI verificado" />
              <VerifiedBadge label="Matrícula gasista" />
            </div>

            <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Rating
                </dt>
                <dd className="mt-1 font-mono text-sm font-bold text-foreground">
                  ★ 4,9
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Trabajos
                </dt>
                <dd className="mt-1 font-mono text-sm font-bold text-foreground">
                  132
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Zona
                </dt>
                <dd className="mt-1 font-mono text-sm font-bold text-foreground">
                  San Martín
                </dd>
              </div>
            </dl>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Así se ve un perfil aprobado. Si no pasa la verificación, no
            aparece en las búsquedas.
          </p>
        </div>
      </div>
    </section>
  );
}
