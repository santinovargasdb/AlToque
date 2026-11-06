"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Pantalla de error de toda la app: reemplaza al "Application error" del navegador. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <AlertCircle className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold">Algo salió mal</h1>
        <p className="text-sm text-muted-foreground">
          No pudimos completar lo que estabas haciendo. Intentá de nuevo.
        </p>
      </div>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
