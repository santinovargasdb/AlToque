import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Para profesionales",
  description:
    "Sumá tu oficio a AlToque y conseguí más trabajos cerca tuyo. Vos cobrás, nosotros te conectamos con clientes verificados.",
};

const BENEFICIOS = [
  ["Más trabajos cerca tuyo", "Recibí pedidos por geolocalización dentro de tu zona y radio de cobertura."],
  ["Cobrá como quieras", "En efectivo o por la app con Mercado Pago. La comisión se descuenta clara y automáticamente."],
  ["Construí tu reputación", "Las reviews reales de tus clientes te traen más trabajo."],
  ["Vos manejás tu agenda", "Ponete online para urgencias o aceptá solo trabajos agendados."],
];

export default function ParaProfesionalesPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-heading text-4xl font-bold">
        Hacé crecer tu oficio con <span className="text-action">AlToque</span>
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Te conectamos con clientes de tu zona que necesitan lo que sabés hacer.
        Registrate, verificá tu identidad y empezá a recibir pedidos.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {BENEFICIOS.map(([t, d]) => (
          <div
            key={t}
            className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
          >
            <h2 className="font-heading text-lg font-semibold">{t}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <Button asChild size="lg" variant="action">
          <Link href="/registro?rol=provider">Quiero sumarme</Link>
        </Button>
      </div>
    </section>
  );
}
