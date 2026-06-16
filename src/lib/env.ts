import { z } from "zod";

/**
 * Validación de variables de entorno con Zod (regla no negociable #5).
 * Falla rápido al iniciar si falta algo. Las `NEXT_PUBLIC_*` se leen
 * literalmente para que Next las inyecte en el bundle del cliente.
 */
const serverSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  MP_CLIENT_ID: z.string().optional(),
  MP_CLIENT_SECRET: z.string().optional(),
  MP_ACCESS_TOKEN: z.string().optional(),
  NEXT_PUBLIC_MP_PUBLIC_KEY: z.string().optional(),
  MP_WEBHOOK_SECRET: z.string().optional(),

  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  GOOGLE_MAPS_SERVER_KEY: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),

  VAPID_PUBLIC_KEY: z.string().optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),

  CRON_SECRET: z.string().optional(),
  COMMISSION_RATE: z
    .string()
    .default("0.12")
    .transform((v) => Number(v))
    .pipe(z.number().min(0).max(1)),
});

const parsed = serverSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Variables de entorno inválidas:",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error("Variables de entorno inválidas. Revisá .env.local");
}

export const env = parsed.data;
export type Env = typeof env;
