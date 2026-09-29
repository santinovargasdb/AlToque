import Link from "next/link";
import { OFICIOS } from "@/lib/constants";
import { Reveal, Stagger, StaggerItem } from "@/components/shared/reveal";
import { OficioCard } from "./oficio-card";

export function OficiosGrid() {
  return (
    <section className="bg-background py-16">
      <div className="mx-auto max-w-[1200px] px-4">
        <Reveal className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
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
        </Reveal>

        <Stagger className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4">
          {OFICIOS.map((o) => (
            <StaggerItem key={o.slug}>
              <OficioCard slug={o.slug} name={o.name} urgent={o.urgent} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
