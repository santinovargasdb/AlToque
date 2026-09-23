import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cómo funciona: AlToque",
  description:
    "Cómo encontrar y contratar profesionales de oficios verificados en AlToque, para urgencias o trabajos agendados.",
};

const PASOS = [
  {
    num: "01",
    t: "Elegí el oficio y tu ubicación",
    d: "Indicá qué necesitás resolver (plomería, cerrajería, gas, electricidad, etc.) y tu punto de atención. Para urgencias, el sistema busca a los prestadores activos en tu radio cercano.",
  },
  {
    num: "02",
    t: "Compará antecedentes y verificación",
    d: "Cada profesional cuenta con validación oficial de DNI y antecedentes. Podés consultar sus calificaciones técnicas, zona habitual y experiencias previas.",
  },
  {
    num: "03",
    t: "Coordiná y seguí el trabajo",
    d: "Chateá dentro de la plataforma y visualizá el avance del servicio en tiempo real desde la solicitud hasta la finalización.",
  },
  {
    num: "04",
    t: "Acuerdo directo y sin intermediarios",
    d: "El valor del trabajo y el medio de cobro se acuerdan libremente entre vos y el técnico. Al concluir, asentás tu calificación para fortalecer la red comunitaria.",
  },
];

export default function ComoFuncionaPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-14">
      <div className="border-b border-border pb-6">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Cómo funciona el servicio
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Estructura de contratación transparente: validación de identidad con DNI, contacto directo y seguimiento en vivo.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        {PASOS.map((p) => (
          <div
            key={p.num}
            className="flex gap-4 rounded-md border border-border bg-card p-5 transition-colors duration-150"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-[4px] border border-primary/30 bg-primary-subtle font-mono text-xs font-bold text-primary">
              {p.num}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-foreground">{p.t}</h2>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{p.d}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
