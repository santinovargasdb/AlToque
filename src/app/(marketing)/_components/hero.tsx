import Link from "next/link";
import { ShieldCheck, Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneDemo } from "./phone-demo";

export function Hero() {
  return (
    <section className="overflow-hidden bg-background">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 pb-16 pt-12 md:pt-16 lg:grid-cols-12 lg:gap-8">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 lg:col-span-7">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
            <ShieldCheck className="size-3.5" />
            Todos los profesionales, verificados con DNI
          </span>

          <h1 className="mt-5 font-heading text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground md:text-6xl">
            El oficio que necesitás,{" "}
            <span className="text-action">al toque</span>.
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            ¿Una pérdida de agua, una cerradura trabada, un enchufe que saltó?
            Contanos qué pasó y te contacta un profesional verificado de tu
            zona. Para la urgencia de ahora mismo o ese arreglo que venís
            pateando hace meses.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" variant="action" className="font-semibold">
              <Link href="/registro">Pedir un servicio</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/para-profesionales">Trabajá con tu oficio</Link>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-success" />
              Identidad validada, uno por uno
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="size-4 fill-warning text-warning" />
              Reseñas de trabajos reales
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4 text-primary" />
              Cerca tuyo, en GBA
            </span>
          </div>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 [animation-delay:150ms] lg:col-span-5">
          <PhoneDemo />
        </div>
      </div>
    </section>
  );
}
