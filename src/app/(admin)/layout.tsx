import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import type { Metadata } from "next";

const NAV = [
  { href: "/admin", label: "Métricas" },
  { href: "/admin/verificaciones", label: "Verificaciones" },
  { href: "/admin/profesionales", label: "Profesionales" },
  { href: "/admin/trabajos", label: "Trabajos" },
];

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground md:flex-row">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card p-4 md:block">
        <div className="mb-6 flex items-center gap-2">
          <Logo href="/admin" size="sm" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Admin</span>
        </div>
        <nav className="space-y-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="block rounded-md px-3 py-2 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Nav mobile */}
      <header className="sticky top-0 z-40 border-b border-border bg-card md:hidden">
        <div className="flex items-center gap-2 px-4 pt-3">
          <Logo href="/admin" size="sm" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Admin</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 py-2">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
