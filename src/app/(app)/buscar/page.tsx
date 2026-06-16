import Link from "next/link";
import { eq } from "drizzle-orm";
import { SearchX, MapPin } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { searchProviders } from "@/lib/db/queries";
import { ProviderCard } from "@/components/app/provider-card";
import { MapView } from "@/components/shared/map-view";
import { Button } from "@/components/ui/button";

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{
    oficio?: string;
    lat?: string;
    lng?: string;
    dir?: string;
  }>;
}) {
  await requireRole("client");
  const { oficio, lat, lng, dir } = await searchParams;
  const latN = Number(lat);
  const lngN = Number(lng);

  if (!oficio || !Number.isFinite(latN) || !Number.isFinite(lngN)) {
    return (
      <EmptyPrompt
        title="Empezá una búsqueda"
        message="Elegí un oficio y tu ubicación para encontrar profesionales cerca tuyo."
      />
    );
  }

  const [cat] = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.slug, oficio))
    .limit(1);

  if (!cat) {
    return (
      <EmptyPrompt
        title="Oficio no encontrado"
        message="Probá con otra categoría desde el inicio."
      />
    );
  }

  const results = await searchProviders({
    categoryId: cat.id,
    lat: latN,
    lng: lngN,
  });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-heading text-2xl font-bold">{cat.name}</h1>
        {dir && (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5" /> {dir}
          </p>
        )}
      </header>

      <MapView
        center={{ lat: latN, lng: lngN }}
        markers={[
          { id: "me", lat: latN, lng: lngN },
          ...results.map((r) => ({ id: r.id, lat: r.lat, lng: r.lng })),
        ]}
      />

      {results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-14 text-center text-muted-foreground">
          <SearchX className="size-8" />
          <p className="font-medium text-foreground">
            No hay {cat.name.toLowerCase()} disponibles en tu zona
          </p>
          <p className="text-sm">
            Probá ampliar la búsqueda o elegí otro oficio.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link href="/inicio">Nueva búsqueda</Link>
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {results.length}{" "}
            {results.length === 1
              ? "profesional encontrado"
              : "profesionales encontrados"}
            , ordenados por cercanía.
          </p>
          <div className="space-y-3">
            {results.map((p) => (
              <ProviderCard key={p.id} provider={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyPrompt({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
      <SearchX className="size-8" />
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-sm">{message}</p>
      <Button asChild size="sm" className="mt-2">
        <Link href="/inicio">Ir a buscar</Link>
      </Button>
    </div>
  );
}
