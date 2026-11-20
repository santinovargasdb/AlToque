import { z } from "zod";

/** Palabra que hay que tipear para confirmar la baja de la cuenta. */
export const DELETE_ACCOUNT_CONFIRMATION = "ELIMINAR";

/** Nombre visible de un perfil que quedó anonimizado tras la baja. */
export const DELETED_ACCOUNT_NAME = "Usuario eliminado";

/** `cancel_reason` de los pedidos abiertos que se cancelan por la baja. */
export const ACCOUNT_DELETED_CANCEL_REASON = "account_deleted";

export const deleteAccountSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .refine((value) => value.toUpperCase() === DELETE_ACCOUNT_CONFIRMATION, {
      message: `Escribí ${DELETE_ACCOUNT_CONFIRMATION} para confirmar.`,
    }),
});
