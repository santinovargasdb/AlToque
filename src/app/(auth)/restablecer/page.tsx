import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Restablecer contraseña" };

/** El link de recovery del email aterriza acá con sesión ya establecida. */
export default async function RestablecerPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/ingresar?error=El%20enlace%20venci%C3%B3.%20Ped%C3%AD%20uno%20nuevo.");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">
          Nueva contraseña
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Elegí una contraseña nueva para tu cuenta.
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
