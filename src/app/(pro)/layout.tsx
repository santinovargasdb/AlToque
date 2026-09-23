import Link from "next/link";
import { requireCompleteProfile } from "@/lib/auth";
import { NotificationsBell } from "@/components/shared/notifications-bell";
import { HeaderBack } from "@/components/shared/header-back";
import { Logo } from "@/components/shared/logo";
import type { Metadata } from "next";

// Shell del profesional con bottom nav.
const NAV_ITEMS = [
  {
    href: "/pro/inicio",
    label: "Inicio",
    svg: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5">
        <rect x="3" y="3" width="6" height="6" rx="1" />
        <rect x="11" y="3" width="6" height="6" rx="1" />
        <rect x="3" y="11" width="6" height="6" rx="1" />
        <rect x="11" y="11" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    href: "/pro/pedidos",
    label: "Pedidos",
    svg: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5">
        <path d="M7 4h6M7 8h6M7 12h4" />
        <rect x="3" y="2" width="14" height="16" rx="1" />
      </svg>
    ),
  },
  {
    href: "/pro/perfil",
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

export default async function ProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCompleteProfile();

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-16 text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <HeaderBack />
            <Logo href="/pro/inicio" variant="pro" size="sm" />
          </div>
          {session && <NotificationsBell userId={session.user.id} />}
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card">
        <div className="mx-auto grid max-w-2xl grid-cols-3">
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
