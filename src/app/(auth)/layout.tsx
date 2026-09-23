import { Logo } from "@/components/shared/logo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="mb-6">
        <Logo href="/" size="lg" />
      </div>

      {/* Contenedor de formulario estructurado con radio 6px */}
      <div className="w-full max-w-sm rounded-md border border-border bg-card p-6 duration-150">
        {children}
      </div>
    </div>
  );
}
