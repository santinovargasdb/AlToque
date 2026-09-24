import Link from "next/link";
import type { Metadata } from "next";
import { Wallet, MapPin, TrendingUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Para profesionales",
  description:
    "Sumá tu oficio a AlToque: pedidos de tu zona, reputación verificada y cero comisión por trabajo. Lo que cobrás es tuyo.",
};

const BENEFICIOS = [
  {
    icon: Wallet,
    t: "Cero comisión por trabajo",
    d: "Otras apps te descuentan un porcentaje de cada laburo. Acá pagás una suscripción fija y lo que cobrás es tuyo, completo.",
  },
  {
    icon: MapPin,
    t: "Trabajos de tu zona",
    d: "Definís tu radio de cobertura y te llegan pedidos cerca tuyo. Vos elegís cuáles tomar; nadie te obliga a cruzar el conurbano.",
  },
  {
    icon: TrendingUp,
    t: "Reputación que abre puertas",
    d: "Cada trabajo cerrado suma una reseña verificada a tu credencial. Tu historial en la app es tu mejor carta de presentación.",
  },
  {
    icon: Clock,
    t: "Tu guardia, tus reglas",
    d: "Activá el modo en línea cuando quieras tomar urgencias y desactivalo cuando no. Los agendados los coordinás por el chat.",
  },
];

const ALTA = [
  {
    t: "Creá tu perfil",
    d: "Registrate con tu mail, elegí tus oficios y contá tu experiencia.",
  },
  {
    t: "Verificá tu identidad",
    d: "Subí tu DNI y una selfie. Si sos gasista o electricista, también tu matrícula. Lo revisamos y te confirmamos.",
  },
  {
    t: "Marcá tu zona y empezá",
    d: "Definí el radio donde trabajás y listo: los pedidos de tu zona empiezan a llegarte al celular.",
  },
];

export default function ParaProfesionalesPage() {
  return (
    <>
      <section className="mx-auto max-w-3xl px-4 pb-4 pt-14">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
          Para profesionales
        </span>
        <h1 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
          Tu oficio, más clientes.{" "}
          <span className="text-action">Sin comisiones.</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Dejá de depender del boca a boca y los grupos de Facebook. Verificate
          una vez y que los vecinos de tu zona te encuentren cuando te
          necesitan.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {BENEFICIOS.map((b) => (
            <div
              key={b.t}
              className="rounded-xl border border-border bg-card p-5 [box-shadow:var(--shadow-soft)]"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary-subtle text-primary">
                <b.icon className="size-5" />
              </span>
              <h2 className="mt-3 font-heading text-base font-bold text-foreground">
                {b.t}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {b.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="font-heading text-xl font-bold text-foreground">
          Entrar lleva tres pasos
        </h2>
        <ol className="mt-5 space-y-3">
          {ALTA.map((p, i) => (
            <li
              key={p.t}
              className="flex items-start gap-4 rounded-xl border border-border bg-card p-4"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary font-heading text-sm font-bold text-primary-foreground">
                {i + 1}
              </span>
              <div>
                <h3 className="font-heading text-sm font-bold text-foreground">
                  {p.t}
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{p.d}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg" className="font-semibold">
            <Link href="/registro?rol=provider">Crear mi perfil profesional</Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            La verificación es gratis. Solo aparecés en búsquedas cuando está
            aprobada.
          </p>
        </div>
      </section>
    </>
  );
}
