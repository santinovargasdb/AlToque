import { OFICIOS } from "@/lib/constants";
import { TradeIcon } from "./trade-icon";

function MarqueeTrack({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden || undefined}>
      {OFICIOS.map((o) => (
        <span
          key={o.slug}
          className="mx-5 inline-flex items-center gap-2.5 text-sm font-medium text-muted-foreground"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary-subtle text-primary">
            <TradeIcon slug={o.slug} className="size-4" />
          </span>
          {o.name}
          {o.urgent && (
            <span className="rounded-md bg-action-subtle px-1.5 py-0.5 font-mono text-[10px] font-bold text-action">
              24h
            </span>
          )}
          <span className="ml-5 size-1 rounded-full bg-border" />
        </span>
      ))}
    </div>
  );
}

/** Banda continua con los 8 oficios: la pista duplica el contenido y se
 *  desplaza el 50%, por eso el loop cierra sin saltos. Se pausa en hover. */
export function OficiosMarquee() {
  return (
    <div className="overflow-hidden border-y border-border bg-card py-3.5">
      <div className="flex w-max animate-marquee">
        <MarqueeTrack />
        <MarqueeTrack ariaHidden />
      </div>
    </div>
  );
}
