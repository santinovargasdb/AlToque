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
    <div className="flex min-h-dvh bg-background">
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
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
