import { z } from "zod";

/**
 * Validaciones de autenticación compartidas entre cliente y servidor.
 * El cliente las usa para feedback en tiempo real (checklist de contraseña,
 * `pattern` del input de email); el servidor las re-valida SIEMPRE en las
 * Server Actions (nunca confiar solo en el browser).
 */

/**
 * Patrón estricto de email para el atributo `pattern` de los inputs
 * (HTML lo ancla implícitamente). Exige TLD de 2+ letras: rechaza
 * `user@localhost`, `a@b`, dobles puntos, etc.
 */
export const EMAIL_INPUT_PATTERN =
  "[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9\\-]+(\\.[a-zA-Z0-9\\-]+)*\\.[a-zA-Z]{2,}";

const emailRegex = new RegExp(`^${EMAIL_INPUT_PATTERN}$`);

/** Email estricto: formato estándar + TLD obligatorio, normalizado a minúsculas. */
export const emailSchema = z
  .string({ required_error: "Ingresá tu email" })
  .trim()
  .toLowerCase()
  .min(1, "Ingresá tu email")
  .max(254, "El email es demasiado largo")
  .regex(emailRegex, "Ingresá un email válido (ej: nombre@dominio.com)");

/**
 * Reglas de contraseña. Única fuente de verdad: alimenta el checklist en vivo
 * del formulario y la validación Zod del servidor.
 */
export const PASSWORD_RULES = [
  {
    id: "length",
    label: "Al menos 8 caracteres",
    test: (pw: string) => pw.length >= 8,
  },
  {
    id: "letter",
    label: "Al menos una letra",
    test: (pw: string) => /[a-zA-ZÀ-ÿ]/.test(pw),
  },
  {
    id: "number",
    label: "Al menos un número",
    test: (pw: string) => /\d/.test(pw),
  },
  {
    id: "special",
    label: "Al menos un carácter especial (!@#$%…)",
    test: (pw: string) => /[^a-zA-Z0-9À-ÿ\s]/.test(pw),
  },
] as const;

/** Contraseña que cumple TODAS las reglas (máx 72 por el hash de Supabase/bcrypt). */
export const passwordSchema = z
  .string({ required_error: "Ingresá una contraseña" })
  .max(72, "La contraseña no puede superar los 72 caracteres")
  .superRefine((pw, ctx) => {
    for (const rule of PASSWORD_RULES) {
      if (!rule.test(pw)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `La contraseña no cumple: ${rule.label.toLowerCase()}`,
        });
      }
    }
  });

/** Ruta interna segura (evita open redirect: debe empezar con "/" y no con "//"). */
const internalPathSchema = z
  .string()
  .regex(/^\/(?!\/)/, "Ruta inválida")
  .max(500);

/** Input de `signUpWithPassword`. */
export const signUpSchema = z
  .object({
    role: z.enum(["client", "provider"]),
    fullName: z
      .string({ required_error: "Ingresá tu nombre" })
      .trim()
      .min(2, "Ingresá tu nombre y apellido")
      .max(120, "El nombre es demasiado largo"),
    phone: z
      .string()
      .trim()
      .max(25, "El teléfono es demasiado largo")
      .regex(/^[\d\s+()-]*$/, "El teléfono solo puede tener números, +, - y espacios")
      .optional()
      .or(z.literal("")),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string({ required_error: "Repetí la contraseña" }),
    redirectTo: internalPathSchema.optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;

/** Input de `signInWithPassword`. */
export const signInSchema = z.object({
  email: emailSchema,
  password: z
    .string({ required_error: "Ingresá tu contraseña" })
    .min(1, "Ingresá tu contraseña")
    .max(72),
});

export type SignInInput = z.infer<typeof signInSchema>;

/** Input de `requestPasswordReset`. */
export const resetRequestSchema = z.object({ email: emailSchema });

/** Input de `updatePassword` (desde /restablecer, con sesión de recovery). */
export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string({ required_error: "Repetí la contraseña" }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });
