import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* Header técnico, plano, sin liquid glass */}
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-[1160px] items-center justify-between px-4">
          <Logo href="/" size="default" />

          <nav className="hidden items-center gap-7 text-xs font-medium text-muted-foreground md:flex">
            <Link
              href="/como-funciona"
              className="transition-colors duration-150 hover:text-foreground"
            >
              Cómo funciona
            </Link>
            <Link
              href="/para-profesionales"
              className="transition-colors duration-150 hover:text-foreground"
            >
              Profesionales
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/ingresar">Ingresar</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/registro">Pedir servicio</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer sobrio, estructurado y con enlaces legales reales */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-[1160px] px-4 py-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <Logo href="/" size="sm" />
              <p className="mt-1 text-xs text-muted-foreground">
                Plataforma de oficios verificados con DNI para el Gran Buenos Aires.
              </p>
            </div>

            <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <Link
                href="/como-funciona"
                className="transition-colors duration-150 hover:text-foreground"
              >
                Cómo funciona
              </Link>
              <Link
                href="/para-profesionales"
                className="transition-colors duration-150 hover:text-foreground"
              >
                Para profesionales
              </Link>
              <Link
                href="/terminos"
                className="transition-colors duration-150 hover:text-foreground"
              >
                Términos y Condiciones
              </Link>
              <Link
                href="/privacidad"
                className="transition-colors duration-150 hover:text-foreground"
              >
                Política de Privacidad
              </Link>
            </nav>
          </div>

          <div className="mt-6 border-t border-border/60 pt-4 text-xs text-muted-foreground">
            <p>(c) {2026} AlToque. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
