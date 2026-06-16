import Link from "next/link";
import {
  Wrench,
  KeyRound,
  Zap,
  Flame,
  House,
  Hammer,
  Paintbrush,
  BrickWall,
  ShieldCheck,
  Star,
  MapPin,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { OFICIOS } from "@/lib/constants";

const ICONS: Record<string, LucideIcon> = {
  Wrench,
  KeyRound,
  Zap,
  Flame,
  House,
  Hammer,
  Paintbrush,
  BrickWall,
};

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-[1200px] px-4 pb-12 pt-12 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 flex justify-center">
            <VerifiedBadge label="Profesionales verificados con DNI" />
          </div>
          <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            El oficio que necesitás,{" "}
            <span className="text-action">al toque</span>.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Plomeros, cerrajeros, electricistas y más — verificados y cerca
            tuyo. Para una urgencia ahora mismo o un trabajo agendado para la
            semana que viene.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/registro">Pedir un servicio</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Link href="/para-profesionales">Ofrecer mi oficio</Link>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-success" /> Identidad
              verificada
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="size-4 text-warning" /> Reviews reales
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4 text-primary" /> Cerca tuyo
            </span>
          </div>
        </div>
      </section>

      {/* Categorías */}
      <section className="mx-auto max-w-[1200px] px-4 py-10">
        <h2 className="mb-6 text-center font-heading text-2xl font-bold md:text-3xl">
          ¿Qué necesitás resolver?
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {OFICIOS.map((o) => {
            const Icon = ICONS[o.icon] ?? Wrench;
            return (
              <Link
                key={o.slug}
                href={`/categorias/${o.slug}`}
                className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-colors hover:border-primary/40"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-6" />
                </span>
                <span className="text-sm font-medium">{o.name}</span>
                {o.urgent && (
                  <span className="inline-flex items-center gap-1 text-xs text-action">
                    <Clock className="size-3" /> Urgencias 24/7
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="bg-card">
        <div className="mx-auto max-w-[1200px] px-4 py-14">
          <h2 className="mb-10 text-center font-heading text-2xl font-bold md:text-3xl">
            Cómo funciona
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                n: 1,
                t: "Buscá o pedí",
                d: "Elegí el oficio y tu dirección. Para una urgencia, avisamos a los profesionales online más cercanos.",
              },
              {
                n: 2,
                t: "Elegí con confianza",
                d: "Verificación con DNI, reviews reales y precio claro antes de confirmar. Sin sorpresas.",
              },
              {
                n: 3,
                t: "Pagá como quieras",
                d: "En efectivo o por la app con Mercado Pago. Seguimiento del trabajo en vivo y chat directo.",
              },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-action/10 font-heading text-lg font-bold text-action">
                  {s.n}
                </span>
                <h3 className="mb-2 font-heading text-lg font-semibold">
                  {s.t}
                </h3>
                <p className="text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA doble */}
      <section className="mx-auto max-w-[1200px] px-4 py-16">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-primary p-8 text-primary-foreground">
            <h3 className="font-heading text-2xl font-bold">
              Necesito un profesional
            </h3>
            <p className="mt-2 text-primary-foreground/90">
              Resolvé tu urgencia o agendá un trabajo con gente verificada.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-6">
              <Link href="/registro">Empezar gratis</Link>
            </Button>
          </div>
          <div className="rounded-2xl border border-border bg-card p-8">
            <h3 className="font-heading text-2xl font-bold">Soy profesional</h3>
            <p className="mt-2 text-muted-foreground">
              Conseguí más trabajos cerca tuyo. Vos cobrás, nosotros te
              conectamos.
            </p>
            <Button asChild size="lg" variant="action" className="mt-6">
              <Link href="/para-profesionales">Sumar mi oficio</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
