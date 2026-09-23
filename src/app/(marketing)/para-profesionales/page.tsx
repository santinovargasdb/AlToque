import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Para profesionales: AlToque",
  description:
    "Sumá tu oficio a AlToque y conseguí más trabajos cerca tuyo. Vos cobrás, nosotros te conectamos con clientes verificados.",
};

const BENEFICIOS = [
  ["Más trabajos en tu radio de cobertura", "Recibí solicitudes por geolocalización filtradas según las localidades que elijas atender."],
  ["Cobro directo y transparente", "El valor del trabajo y el medio de cobro los definís vos con el cliente. AlToque no intermedia pagos operativos."],
  ["Historial profesional verificable", "Las calificaciones de trabajos concluidos quedan asociadas a tu matrícula y perfil para generar mayor demanda."],
  ["Disponibilidad flexible", "Activá tu estado online cuando tengas guardia disponible para urgencias o administrá exclusivamente pedidos agendados."],
];

export default function ParaProfesionalesPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-14">
      <div className="border-b border-border pb-6">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Sumá tu oficio a la red <span className="text-primary">AlToque</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Conexión directa con clientes de Gran Buenos Aires que buscan trabajadores calificados con DNI validado.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {BENEFICIOS.map(([t, d], idx) => (
          <div
            key={t}
            className="flex flex-col justify-between rounded-md border border-border bg-card p-5 transition-colors duration-150"
          >
            <div>
              <span className="font-mono text-xs font-bold text-primary">0{idx + 1}</span>
              <h2 className="mt-2 text-sm font-bold text-foreground">{t}</h2>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{d}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button asChild size="lg">
          <Link href="/registro?rol=provider">Comenzar registro profesional</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/como-funciona">Consultar requisitos</Link>
        </Button>
      </div>
    </section>
  );
}
