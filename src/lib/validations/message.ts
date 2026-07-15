import { z } from "zod";

/** Input de `sendMessage` (chat por trabajo, Step 11). */
export const sendMessageSchema = z.object({
  jobId: z.string().uuid(),
  body: z
    .string()
    .trim()
    .min(1, "Escribí un mensaje")
    .max(2000, "El mensaje es demasiado largo"),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
