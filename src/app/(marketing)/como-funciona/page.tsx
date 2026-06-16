import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cómo funciona",
  description:
    "Cómo encontrar y contratar profesionales de oficios verificados en AlToque, para urgencias o trabajos agendados.",
};

const PASOS = [
  {
    t: "1. Elegí el oficio y tu ubicación",
    d: "Decinos qué necesitás (plomería, cerrajería, etc.) y dónde. Para urgencias, encontramos a los profesionales online más cercanos.",
  },
  {
    t: "2. Compará con confianza",
    d: "Cada profesional está verificado con DNI y selfie. Mirá sus reviews reales, su rating y el precio estimado antes de confirmar.",
  },
  {
    t: "3. Coordiná y seguí el trabajo",
    d: "Chateá dentro de la app y seguí el estado del pedido en vivo: aceptado, en curso, completado.",
  },
  {
    t: "4. Pagá como prefieras",
    d: "En efectivo o por la app con Mercado Pago. Al terminar, dejás tu reseña y ayudás a otros a elegir mejor.",
  },
];

export default function ComoFuncionaPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-heading text-4xl font-bold">Cómo funciona</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Confianza de punta a punta: profesionales verificados, precios claros y
        seguimiento en vivo.
      </p>
      <div className="mt-10 space-y-6">
        {PASOS.map((p) => (
          <div
            key={p.t}
            className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
          >
            <h2 className="font-heading text-lg font-semibold">{p.t}</h2>
            <p className="mt-1.5 text-muted-foreground">{p.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
