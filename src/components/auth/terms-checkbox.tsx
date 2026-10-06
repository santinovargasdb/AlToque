"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Checkbox de consentimiento legal del alta de cuenta: en un solo tilde el
 * usuario declara ser mayor de 18 años (capacidad para contratar) y acepta
 * los Términos y la Política de Privacidad. Los links abren en pestaña nueva
 * para no perder los datos ya cargados en el formulario.
 *
 * Es un componente controlado: el padre es la fuente de verdad del
 * consentimiento (así un mismo tilde puede gobernar varios métodos de alta).
 *
 * @param checked Estado del tilde (lo mantiene el padre).
 * @param onCheckedChange Callback con el nuevo estado.
 * @param id Id del input (único por página si hay más de uno).
 */
export function TermsCheckbox({
  checked,
  onCheckedChange,
  id = "accept-terms",
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  className?: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-2.5 text-sm text-muted-foreground",
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        required
      />
      <span>
        Soy mayor de 18 años y acepto los{" "}
        <Link
          href="/terminos"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline underline-offset-2"
        >
          Términos
        </Link>{" "}
        y la{" "}
        <Link
          href="/privacidad"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline underline-offset-2"
        >
          Política de Privacidad
        </Link>
        .
      </span>
    </label>
  );
}
