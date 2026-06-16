import Link from "next/link";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="size-5" />
            </span>
            <span className="font-heading text-lg font-bold">AlToque</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link href="/como-funciona" className="hover:text-foreground">
              Cómo funciona
            </Link>
            <Link href="/para-profesionales" className="hover:text-foreground">
              Soy profesional
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/ingresar">Ingresar</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/registro">Pedir un servicio</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {2026} AlToque · Oficios verificados, al toque.</p>
          <nav className="flex flex-wrap gap-4">
            <Link href="/como-funciona" className="hover:text-foreground">
              Cómo funciona
            </Link>
            <Link href="/para-profesionales" className="hover:text-foreground">
              Para profesionales
            </Link>
            <Link href="/registro" className="hover:text-foreground">
              Registrarse
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
