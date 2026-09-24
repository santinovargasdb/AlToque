import Link from "next/link";
import { OFICIOS } from "@/lib/constants";
import { TradeIcon } from "./trade-icon";

export function OficiosGrid() {
  return (
    <section className="bg-background py-16">
      <div className="mx-auto max-w-[1200px] px-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              ¿Qué necesitás resolver?
            </h2>
            <p className="mt-2 text-muted-foreground">
              Ocho oficios, todos con identidad verificada. Los marcados con
              24h atienden urgencias.
            </p>
          </div>
          <Link
            href="/buscar"
            className="text-sm font-medium text-primary hover:underline"
          >
            Ver el mapa completo →
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4">
          {OFICIOS.map((o) => (
            <Link
              key={o.slug}
              href={`/categorias/${o.slug}`}
              className="group rounded-xl border border-border bg-card p-4 transition-[transform,box-shadow,border-color] duration-150 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:[box-shadow:var(--shadow-card)] md:p-5"
            >
              <div className="flex items-start justify-between">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary-subtle text-primary transition-colors duration-150 group-hover:bg-primary group-hover:text-primary-foreground">
                  <TradeIcon slug={o.slug} className="size-5" />
                </span>
                {o.urgent && (
                  <span className="rounded-md bg-action-subtle px-1.5 py-0.5 font-mono text-[10px] font-bold text-action">
                    24h
                  </span>
                )}
              </div>
              <p className="mt-5 font-heading text-sm font-bold text-foreground group-hover:text-primary">
                {o.name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ver quién está cerca
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
