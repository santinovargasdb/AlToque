import Link from "next/link";
import type { Metadata } from "next";
import { OtpForm } from "@/components/auth/otp-form";

export const metadata: Metadata = { title: "Ingresar" };

export default async function IngresarPage({
  searchParams,
}: {
  searchParams: Promise<{ returnUrl?: string }>;
}) {
  const { returnUrl } = await searchParams;
  // Solo permitir returnUrls internos (evita open redirect).
  const safeReturn =
    returnUrl && returnUrl.startsWith("/") ? returnUrl : "/inicio";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Ingresá a AlToque</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Te enviamos un código por email para entrar.
        </p>
      </div>

      <OtpForm mode="login" redirectTo={safeReturn} />

      <p className="text-center text-sm text-muted-foreground">
        ¿No tenés cuenta?{" "}
        <Link href="/registro" className="font-medium text-primary">
          Registrate
        </Link>
      </p>
    </div>
  );
}
