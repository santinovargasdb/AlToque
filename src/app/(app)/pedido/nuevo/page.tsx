import Link from "next/link";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { UserSearch } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  profiles,
  providerProfiles,
  providerCategories,
  categories,
} from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { NewOrderWizard } from "@/components/app/new-order-wizard";

export default async function NuevoPedidoPage({
  searchParams,
}: {
  searchParams: Promise<{ providerId?: string }>;
}) {
  const { user } = await requireRole("client");
  const { providerId } = await searchParams;

  if (!providerId || !z.string().uuid().safeParse(providerId).success) {
    return <Prompt />;
  }

  const [prov] = await db
    .select({
      name: profiles.fullName,
      status: providerProfiles.verificationStatus,
    })
    .from(providerProfiles)
    .innerJoin(profiles, eq(profiles.id, providerProfiles.profileId))
    .where(eq(providerProfiles.profileId, providerId))
    .limit(1);

  if (!prov || prov.status !== "approved") return <Prompt />;

  const provCats = await db
    .select({ id: categories.id, name: categories.name })
    .from(providerCategories)
    .innerJoin(categories, eq(categories.id, providerCategories.categoryId))
    .where(eq(providerCategories.providerId, providerId))
    .orderBy(categories.name);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Nuevo pedido</h1>
      <NewOrderWizard
        userId={user.id}
        providerId={providerId}
        providerName={prov.name ?? "el profesional"}
        categories={provCats}
      />
    </div>
  );
}

function Prompt() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
      <UserSearch className="size-8" />
      <p className="font-medium text-foreground">Elegí un profesional primero</p>
      <p className="text-sm">
        Buscá por oficio y zona, mirá su perfil y pedile el servicio desde ahí.
      </p>
      <Button asChild size="sm" className="mt-2">
        <Link href="/inicio">Buscar profesionales</Link>
      </Button>
    </div>
  );
}
