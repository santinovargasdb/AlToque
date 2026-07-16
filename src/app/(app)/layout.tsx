import Link from "next/link";
import { Home, Search, MessageSquare, User, Zap } from "lucide-react";
import { requireCompleteProfile } from "@/lib/auth";
import { NotificationsBell } from "@/components/shared/notifications-bell";

// Shell mobile-first del cliente con bottom nav (Sección 6 del blueprint).
const NAV = [
  { href: "/inicio", label: "Inicio", icon: Home },
  { href: "/buscar", label: "Buscar", icon: Search },
  { href: "/mensajes", label: "Mensajes", icon: MessageSquare },
  { href: "/perfil", label: "Perfil", icon: User },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Gate de onboarding: sin nombre/teléfono no se entra al dashboard
  // (los registros vía Google/OTP pueden llegar sin esos datos).
  const session = await requireCompleteProfile();

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-16">
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2">
          <Link href="/inicio" className="flex items-center gap-1.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="size-4" />
            </span>
            <span className="font-heading font-bold">AlToque</span>
          </Link>
          {session && <NotificationsBell userId={session.user.id} />}
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {children}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card">
        <div className="mx-auto grid max-w-2xl grid-cols-4">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 py-2.5 text-xs text-muted-foreground hover:text-primary"
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
