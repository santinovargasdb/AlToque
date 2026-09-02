import { asc } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { NewOrderWizard } from "@/components/app/new-order-wizard";

export default async function PedidoUrgentePage() {
  const { user } = await requireRole("client");

  const cats = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Necesito ayuda ahora</h1>
        <p className="text-muted-foreground">
          Buscamos el profesional disponible más cercano y te conectamos al
          instante.
        </p>
      </div>
      <NewOrderWizard userId={user.id} mode="broadcast" categories={cats} />
    </div>
  );
}
