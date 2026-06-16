import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { ClientSearch } from "@/components/app/client-search";

export default async function InicioClientePage({
  searchParams,
}: {
  searchParams: Promise<{ oficio?: string }>;
}) {
  const { profile } = await requireRole("client");
  const { oficio } = await searchParams;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">
            Hola{profile?.fullName ? `, ${profile.fullName}` : ""} 👋
          </h1>
          <p className="text-muted-foreground">¿Qué necesitás resolver hoy?</p>
        </div>
        <SignOutButton />
      </header>

      <ClientSearch defaultOficio={oficio} />

      <Link
        href="/pedidos"
        className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm shadow-[0_1px_3px_rgba(15,23,42,0.08)] hover:border-primary/40"
      >
        <ClipboardList className="size-5 text-primary" />
        <span className="font-medium">Mis pedidos</span>
        <span className="ml-auto text-muted-foreground">Ver historial →</span>
      </Link>

      <p className="text-center text-xs text-muted-foreground">
        Todos los profesionales están verificados con DNI. Elegí con confianza.
      </p>
    </div>
  );
}
