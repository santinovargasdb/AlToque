"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccount } from "@/lib/actions/account";
import { DELETE_ACCOUNT_CONFIRMATION } from "@/lib/validations/account";

/**
 * Baja de la cuenta desde el perfil. Pide tipear la palabra de confirmación
 * (sin dialogs nativos); la validación real corre en `deleteAccount`. En éxito
 * la Server Action redirige a /ingresar, así que acá solo se maneja el fracaso.
 */
export function DeleteAccount({ isProvider = false }: { isProvider?: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, startTransition] = useTransition();

  const matches =
    confirmation.trim().toUpperCase() === DELETE_ACCOUNT_CONFIRMATION;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!matches) return;
    startTransition(async () => {
      try {
        const res = await deleteAccount({ confirmation });
        // Solo llega acá si falló: en éxito la acción redirige.
        if (res && !res.ok) toast.error(res.error);
      } catch {
        toast.error("No pudimos eliminar tu cuenta. Probá de nuevo.");
      }
    });
  }

  return (
    <section className="rounded-md border border-destructive/30 bg-card p-5">
      <h2 className="font-heading font-semibold">Eliminar cuenta</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Borra tus datos personales y cierra tu acceso. No se puede deshacer.
      </p>

      {!open ? (
        <Button
          size="sm"
          variant="outline"
          className="mt-4 text-destructive"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="size-4" />
          Eliminar mi cuenta
        </Button>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Borramos tu nombre, teléfono, foto y métodos de acceso.</li>
            {isProvider && (
              <li>
                Borramos tu DNI, selfie y matrícula, y dejás de aparecer en las
                búsquedas.
              </li>
            )}
            <li>Si tenés una suscripción, se cancela y no se vuelve a cobrar.</li>
            <li>Tus pedidos sin aceptar se cancelan.</li>
            <li>
              Los trabajos ya realizados, sus mensajes y reseñas quedan sin tu
              nombre, porque también son de la otra persona.
            </li>
          </ul>
          <div className="space-y-1.5">
            <Label htmlFor="delete-confirmation">
              Escribí {DELETE_ACCOUNT_CONFIRMATION} para confirmar
            </Label>
            <Input
              id="delete-confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              disabled={pending}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              size="sm"
              variant="destructive"
              disabled={!matches || pending}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Eliminar definitivamente
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                setConfirmation("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
