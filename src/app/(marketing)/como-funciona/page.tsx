import Link from "next/link";
import type { Metadata } from "next";
import { Zap, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Cómo funciona",
  description:
    "Cómo encontrar y contratar profesionales de oficios verificados en AlToque, para urgencias o trabajos agendados.",
};

const PASOS = [
  {
    t: "Contanos qué pasó",
    d: "Elegí el oficio, poné tu dirección y si querés sumale fotos del problema. Cuanto más claro el pedido, mejores respuestas te llegan.",
  },
  {
    t: "Mirá quién está cerca",
    d: "Te mostramos profesionales verificados de tu zona: su credencial con DNI validado, sus reseñas de trabajos reales y a cuántas cuadras están.",
  },
  {
    t: "Coordinen por el chat",
    d: "Hablás directo con el profesional adentro de la app: horario, detalles, presupuesto. Todo queda registrado en el pedido.",
  },
  {
    t: "Acuerdan el precio, resuelve y calificás",
    d: "El valor y el medio de pago los arreglan entre ustedes, sin recargos nuestros. Cuando el trabajo cierra, tu reseña queda en su perfil.",
  },
];

export default function ComoFuncionaPage() {
  return (
    <>
      <section className="mx-auto max-w-3xl px-4 pb-4 pt-14">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
          De &quot;se rompió&quot; a &quot;ya está&quot;,{" "}
          <span className="text-action">al toque</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Sin llamados a desconocidos ni cadenas de WhatsApp pidiendo &quot;¿alguien
          conoce un plomero?&quot;. Así funciona:
        </p>

        <ol className="mt-10 space-y-4">
          {PASOS.map((p, i) => (
            <li
              key={p.t}
              className="flex gap-5 rounded-xl border border-border bg-card p-5 [box-shadow:var(--shadow-soft)]"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary font-heading text-base font-bold text-primary-foreground">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-base font-bold text-foreground">
                  {p.t}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {p.d}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="font-heading text-xl font-bold text-foreground">
          ¿Urgencia o agendado?
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-action/30 bg-action-subtle p-5">
            <span className="inline-flex items-center gap-1.5 font-heading text-sm font-bold text-action">
              <Zap className="size-4" /> Urgente
            </span>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Para lo que no puede esperar: pérdidas, cerraduras, cortes de
              luz, olor a gas. Tu pedido les llega en tiempo real a los
              profesionales en línea de tu zona y el primero que acepta va.
            </p>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary-subtle p-5">
            <span className="inline-flex items-center gap-1.5 font-heading text-sm font-bold text-primary">
              <CalendarClock className="size-4" /> Agendado
            </span>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Para el arreglo que puede esperar a que estés en casa: elegís al
              profesional por su perfil y coordinan día y horario por el chat.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" variant="action" className="font-semibold">
            <Link href="/registro">Pedir un servicio</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/para-profesionales">Soy profesional</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
