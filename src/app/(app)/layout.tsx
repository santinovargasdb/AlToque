import Link from "next/link";
import { requireCompleteProfile } from "@/lib/auth";
import { NotificationsBell } from "@/components/shared/notifications-bell";
import { HeaderBack } from "@/components/shared/header-back";
import { Logo } from "@/components/shared/logo";
import type { Metadata } from "next";

// Shell del cliente con navegación inferior (sin liquid glass, radios contenidos).
const NAV_ITEMS = [
  {
    href: "/inicio",
    label: "Inicio",
    svg: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5">
        <path d="m3 9 7-6 7 6v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9Z" />
        <path d="M7 18v-6h6v6" />
      </svg>
    ),
  },
  {
    href: "/buscar",
    label: "Buscar",
    svg: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5">
        <circle cx="8.5" cy="8.5" r="5.5" />
        <path d="m13 13 4.5 4.5" />
      </svg>
    ),
  },
  {
    href: "/mensajes",
    label: "Mensajes",
    svg: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5">
        <path d="M4 4h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7l-4 3V6a2 2 0 0 1 2-2Z" />
      </svg>
    ),
  },
  {
    href: "/perfil",
    label: "Perfil",
    svg: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5">
        <circle cx="10" cy="6" r="3.5" />
        <path d="M3.5 17a6.5 6.5 0 0 1 13 0" />
      </svg>
    ),
  },
];

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCompleteProfile();

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-16 text-foreground">
      {/* Header plano, limpio, con logo centralizado */}
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <HeaderBack />
            <Logo href="/inicio" size="sm" />
          </div>
          {session && <NotificationsBell userId={session.user.id} />}
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {children}
      </main>

      {/* Barra de navegación inferior móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card">
        <div className="mx-auto grid max-w-2xl grid-cols-4">
          {NAV_ITEMS.map(({ href, label, svg }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors duration-150 hover:text-primary active:bg-secondary/40"
            >
              {svg}
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
