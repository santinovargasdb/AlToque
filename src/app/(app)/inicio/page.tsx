import Link from "next/link";
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
      <header className="flex items-start justify-between border-b border-border pb-4">
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">
            Hola{profile?.fullName ? `, ${profile.fullName}` : ""}
          </h1>
          <p className="text-xs text-muted-foreground">¿Qué necesitás resolver hoy?</p>
        </div>
        <SignOutButton />
      </header>

      {/* Banner de guardia urgente: pastel terracota técnico, 6px, sin emojis ni sombras difusas */}
      <Link
        href="/pedido/urgente"
        className="flex items-center gap-3 rounded-md border border-action/40 bg-action/5 p-4 text-sm transition-colors duration-150 hover:bg-action/10"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[4px] border border-action/30 bg-action/10 text-action">
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
            <polygon points="11 2 3 11 10 11 9 18 17 9 10 9 11 2" />
          </svg>
        </span>
        <div className="flex-1">
          <span className="block font-semibold text-action">
            Atención de urgencia
          </span>
          <span className="block text-xs text-muted-foreground">
            Conexión con el técnico disponible más próximo
          </span>
        </div>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-4 shrink-0 text-muted-foreground">
          <path d="M6 3.5 10.5 8 6 12.5" />
        </svg>
      </Link>

      <ClientSearch defaultOficio={oficio} />

      <Link
        href="/pedidos"
        className="flex items-center gap-3 rounded-md border border-border bg-card p-4 text-sm transition-colors duration-150 hover:border-primary/40"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5 text-primary">
          <path d="M7 4h6M7 8h6M7 12h4" />
          <rect x="3" y="2" width="14" height="16" rx="1" />
        </svg>
        <span className="font-medium text-foreground">Mis pedidos</span>
        <span className="ml-auto text-xs text-muted-foreground">Historial →</span>
      </Link>

      <p className="text-center text-xs text-muted-foreground">
        Profesionales verificados con DNI. Contacto directo y sin intermediación.
      </p>
    </div>
  );
}
