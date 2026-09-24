import Link from "next/link";
import { OFICIOS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { TradeIcon } from "./trade-icon";

const URGENTES = OFICIOS.filter((o) => o.urgent);

export function Urgencias() {
  return (
    <section className="bg-foreground py-16 text-background">
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-action/40 bg-action/15 px-3 py-1 text-xs font-semibold text-action">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full rounded-full bg-action animate-live-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-action" />
            </span>
            Guardia activa ahora
          </span>

          <h2 className="mt-4 font-heading text-2xl font-bold tracking-tight md:text-4xl">
            ¿Es para ahora? También estamos a las 3 de la mañana.
          </h2>
          <p className="mt-4 max-w-lg text-background/70">
            Un caño que explotó no espera al lunes. Los pedidos urgentes se
            despachan en tiempo real a los profesionales que están en línea en
            tu zona: el primero que acepta, va.
          </p>

          <div className="mt-7">
            <Button asChild size="lg" variant="action" className="font-semibold">
              <Link href="/pedido/urgente">Pedir una urgencia</Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap content-center gap-3">
          {URGENTES.map((o) => (
            <span
              key={o.slug}
              className="inline-flex items-center gap-2.5 rounded-xl border border-background/15 bg-background/5 px-4 py-3 text-sm font-medium text-background/90"
            >
              <TradeIcon slug={o.slug} className="size-4 text-action" />
              {o.name}
              <span className="font-mono text-[10px] font-bold text-action">
                24h
              </span>
            </span>
          ))}
          <p className="mt-2 w-full text-xs text-background/50">
            Los demás oficios trabajan con visitas agendadas: elegís día y
            horario con el profesional.
          </p>
        </div>
      </div>
    </section>
  );
}
