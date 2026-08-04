import Link from "next/link";
import { Zap } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Métricas" },
  { href: "/admin/verificaciones", label: "Verificaciones" },
  { href: "/admin/profesionales", label: "Profesionales" },
  { href: "/admin/trabajos", label: "Trabajos" },
  { href: "/admin/comisiones", label: "Comisiones" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background md:flex-row">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card p-4 md:block">
        <Link href="/admin" className="mb-6 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="size-5" />
          </span>
          <span className="font-heading font-bold">AlToque · Admin</span>
        </Link>
        <nav className="space-y-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      {/* Nav mobile: en < md el sidebar desaparece; barra horizontal scrolleable
          bajo el header, mismo patrón de barras server-side que (app)/(pro). */}
      <header className="sticky top-0 z-40 border-b border-border bg-card md:hidden">
        <Link href="/admin" className="flex items-center gap-2 px-4 pt-3">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="size-4" />
          </span>
          <span className="font-heading font-bold">AlToque · Admin</span>
        </Link>
        <nav className="flex gap-1 overflow-x-auto px-2 py-2">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
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
