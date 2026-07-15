import Link from "next/link";
import { LayoutDashboard, ClipboardList, Wallet, User } from "lucide-react";
import { requireCompleteProfile } from "@/lib/auth";

// Shell del profesional con bottom nav.
const NAV = [
  { href: "/pro/inicio", label: "Inicio", icon: LayoutDashboard },
  { href: "/pro/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/pro/cobros", label: "Cobros", icon: Wallet },
  { href: "/pro/perfil", label: "Perfil", icon: User },
];

export default async function ProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Gate de onboarding: sin nombre/teléfono no se entra al dashboard.
  // La activación del profesional (oficios/zona/verificación) la sigue
  // guiando el checklist de /pro/inicio + la regla "solo approved".
  await requireCompleteProfile();
  return (
    <div className="flex min-h-dvh flex-col bg-background pb-16">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {children}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card">
        <div className="mx-auto grid max-w-2xl grid-cols-4">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 py-2.5 text-xs text-muted-foreground hover:text-action"
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
