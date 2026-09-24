import Link from "next/link";
import { Wallet, MapPin, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const BENEFICIOS = [
  {
    icon: Wallet,
    titulo: "Cero comisión por trabajo",
    detalle:
      "Pagás una suscripción fija por usar la plataforma. Lo que cobrás por cada trabajo es tuyo, completo.",
  },
  {
    icon: MapPin,
    titulo: "Pedidos de tu zona, en tu celu",
    detalle:
      "Definís tu radio de cobertura y te llegan los trabajos cerca tuyo. Vos elegís cuáles tomar.",
  },
  {
    icon: TrendingUp,
    titulo: "Tu reputación trabaja con vos",
    detalle:
      "Cada trabajo cerrado suma una reseña verificada a tu credencial. Tu historial es tu mejor carta de presentación.",
  },
] as const;

export function ProCta() {
  return (
    <section className="bg-background py-16">
      <div className="mx-auto max-w-[1200px] px-4">
        <div className="rounded-2xl border border-primary/20 bg-primary-subtle p-8 md:p-12">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
                Para profesionales
              </span>
              <h2 className="mt-3 font-heading text-2xl font-bold tracking-tight text-foreground md:text-4xl">
                ¿Laburás de esto? Que te encuentren.
              </h2>
              <p className="mt-4 max-w-lg text-muted-foreground">
                Mientras otras apps te descuentan un porcentaje de cada
                trabajo, acá tu plata es tuya. Verificate una vez y empezá a
                recibir pedidos de tu zona.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="font-semibold">
                  <Link href="/registro">Crear mi perfil profesional</Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link href="/para-profesionales">Ver cómo funciona →</Link>
                </Button>
              </div>
            </div>

            <ul className="space-y-5">
              {BENEFICIOS.map((b) => (
                <li key={b.titulo} className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card text-primary [box-shadow:var(--shadow-soft)]">
                    <b.icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-heading text-base font-bold text-foreground">
                      {b.titulo}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {b.detalle}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
