import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { OFICIOS } from "@/lib/constants";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4">
          <Logo href="/" size="default" />

          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
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
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/ingresar">Ingresar</Link>
            </Button>
            <Button asChild size="sm" variant="action" className="font-semibold">
              <Link href="/registro">Pedir un servicio</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-[1200px] px-4 py-12">
          <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr]">
            <div>
              <Logo href="/" size="default" />
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Profesionales de oficio verificados con DNI, cerca tuyo. Para
                la urgencia de ahora o el arreglo de la semana que viene, en el
                Gran Buenos Aires.
              </p>
            </div>

            <nav aria-label="Oficios">
              <h3 className="font-heading text-sm font-bold text-foreground">
                Oficios
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {OFICIOS.slice(0, 5).map((o) => (
                  <li key={o.slug}>
                    <Link
                      href={`/categorias/${o.slug}`}
                      className="transition-colors duration-150 hover:text-foreground"
                    >
                      {o.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/buscar"
                    className="font-medium text-primary transition-colors duration-150 hover:text-primary-hover"
                  >
                    Ver todos →
                  </Link>
                </li>
              </ul>
            </nav>

            <nav aria-label="AlToque">
              <h3 className="font-heading text-sm font-bold text-foreground">
                AlToque
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    href="/como-funciona"
                    className="transition-colors duration-150 hover:text-foreground"
                  >
                    Cómo funciona
                  </Link>
                </li>
                <li>
                  <Link
                    href="/para-profesionales"
                    className="transition-colors duration-150 hover:text-foreground"
                  >
                    Para profesionales
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terminos"
                    className="transition-colors duration-150 hover:text-foreground"
                  >
                    Términos y Condiciones
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacidad"
                    className="transition-colors duration-150 hover:text-foreground"
                  >
                    Política de Privacidad
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          <div className="mt-10 flex flex-col gap-2 border-t border-border/60 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>(c) 2026 AlToque. Todos los derechos reservados.</p>
            <p>Hecho en el conurbano bonaerense.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
