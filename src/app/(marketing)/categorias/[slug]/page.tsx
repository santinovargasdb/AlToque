import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { OFICIOS } from "@/lib/constants";

// SEO local: una página por oficio. Pre-renderizadas en build.
export function generateStaticParams() {
  return OFICIOS.map((o) => ({ slug: o.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const oficio = OFICIOS.find((o) => o.slug === slug);
  if (!oficio) return {};
  return {
    title: `${oficio.name} verificados cerca tuyo`,
    description: `Encontrá ${oficio.name.toLowerCase()} verificados con DNI y reviews reales en tu zona. Urgencias y trabajos agendados con AlToque.`,
  };
}

export default async function CategoriaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const oficio = OFICIOS.find((o) => o.slug === slug);
  if (!oficio) notFound();

  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-3">
        <VerifiedBadge label="Verificados con DNI" />
      </div>
      <h1 className="font-heading text-4xl font-bold">
        {oficio.name} cerca tuyo
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">
        {oficio.name} verificados, con reviews reales y precios claros.
        {oficio.urgent
          ? " Disponibles también para urgencias 24/7."
          : " Coordiná tu trabajo agendado en minutos."}
      </p>
      <div className="mt-8">
        <Button asChild size="lg">
          <Link href={`/registro?oficio=${oficio.slug}`}>
            Buscar {oficio.name.toLowerCase()}
          </Link>
        </Button>
      </div>
    </section>
  );
}
