import { Camera, Users, Handshake } from "lucide-react";

const PASOS = [
  {
    icon: Camera,
    titulo: "Contanos qué pasó",
    detalle:
      "Elegí el oficio, poné tu dirección y si querés sacale una foto al problema. Dos minutos, sin vueltas.",
  },
  {
    icon: Users,
    titulo: "Te responde alguien cerca",
    detalle:
      "Avisamos a los profesionales verificados de tu zona. Ves su perfil, sus reseñas y a cuántas cuadras está antes de decidir.",
  },
  {
    icon: Handshake,
    titulo: "Acuerdan, resuelve y calificás",
    detalle:
      "El precio lo arreglan entre ustedes, sin recargos nuestros. Cuando termina, tu reseña queda en su perfil para el próximo vecino.",
  },
] as const;

export function ComoFunciona() {
  return (
    <section className="border-b border-border bg-card py-16">
      <div className="mx-auto max-w-[1200px] px-4">
        <div className="max-w-2xl">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Así de fácil
          </h2>
          <p className="mt-2 text-muted-foreground">
            Tres pasos entre &quot;se rompió&quot; y &quot;ya está&quot;.
          </p>
        </div>

        <ol className="relative mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
          {/* Conector punteado entre pasos (solo desktop) */}
          <div
            className="absolute left-[16%] right-[16%] top-6 hidden border-t-2 border-dashed border-border md:block"
            aria-hidden="true"
          />
          {PASOS.map((paso, i) => (
            <li key={paso.titulo} className="relative">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground [box-shadow:var(--shadow-card)]">
                <paso.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-heading text-lg font-bold text-foreground">
                <span className="mr-2 font-mono text-sm font-bold text-primary">
                  {i + 1}.
                </span>
                {paso.titulo}
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {paso.detalle}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
