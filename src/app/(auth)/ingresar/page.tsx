import Link from "next/link";
import type { Metadata } from "next";
import { LoginFlow } from "@/components/auth/login-flow";

export const metadata: Metadata = { title: "Ingresar" };

export default async function IngresarPage({
  searchParams,
}: {
  searchParams: Promise<{ returnUrl?: string; error?: string; notice?: string }>;
}) {
  const { returnUrl, error, notice } = await searchParams;
  // Solo permitir returnUrls internos (evita open redirect).
  const safeReturn =
    returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("//")
      ? returnUrl
      : "/inicio";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Ingresá a AlToque</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Con tu email y contraseña, o con un código por email.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Avisos informativos (ej. confirmación del cierre de sesión global). */}
      {notice && (
        <p className="rounded-lg border border-success/30 bg-success/5 p-3 text-sm text-success">
          {notice}
        </p>
      )}

      <LoginFlow redirectTo={safeReturn} />

      <p className="text-center text-sm text-muted-foreground">
        ¿No tenés cuenta?{" "}
        <Link href="/registro" className="font-medium text-primary">
          Registrate
        </Link>
      </p>
    </div>
  );
}
