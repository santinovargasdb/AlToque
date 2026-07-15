/**
 * Logging centralizado de errores de autenticación (cliente y servidor).
 *
 * Objetivo: que todo fallo de auth (callback, login, registro, OAuth,
 * recovery, vinculación) quede registrado con un formato uniforme y
 * fácilmente filtrable (`[auth]` en los logs de Vercel / consola del
 * browser), SIN volcar jamás material sensible.
 *
 * Reglas de sanitización:
 *  - Cualquier clave de metadata cuyo nombre matchee token/code/secret/
 *    password/key/hash/authorization se REDACTA (queda "[redacted]").
 *  - De los errores solo se serializan name/message/status/code (los
 *    AuthError de Supabase no incluyen credenciales en el message).
 *  - Los mensajes se truncan a 300 chars por higiene de logs.
 *
 * Isomórfico a propósito (sin "server-only"): en el server escribe al
 * stdout que recolecta Vercel; en el browser, a la consola (útil para
 * reproducir reportes de usuarios sin exponer nada sensible).
 */

/** Claves de metadata que nunca deben llegar al log con su valor real. */
const SENSITIVE_KEY = /token|code|secret|password|key|hash|authorization/i;

const MAX_MESSAGE_LENGTH = 300;

/** Metadata segura y serializable para acompañar el error. */
export type AuthLogMeta = Record<
  string,
  string | number | boolean | null | undefined
>;

/** Forma normalizada de un error para el log (sin datos sensibles). */
type SerializedError = {
  name: string;
  message: string;
  /** Status HTTP de los AuthError de Supabase (si existe). */
  status?: number;
  /** Código de error de Supabase (ej. "identity_not_found"), si existe. */
  code?: string;
};

/** Normaliza cualquier `unknown` lanzado/devuelto a una forma loggeable. */
function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    const maybe = error as Error & { status?: unknown; code?: unknown };
    return {
      name: error.name,
      message: error.message.slice(0, MAX_MESSAGE_LENGTH),
      ...(typeof maybe.status === "number" ? { status: maybe.status } : {}),
      ...(typeof maybe.code === "string" ? { code: maybe.code } : {}),
    };
  }
  if (error && typeof error === "object" && "message" in error) {
    return {
      name: "UnknownError",
      message: String((error as { message: unknown }).message).slice(
        0,
        MAX_MESSAGE_LENGTH,
      ),
    };
  }
  return { name: "UnknownError", message: String(error).slice(0, MAX_MESSAGE_LENGTH) };
}

/** Redacta los valores de las claves sensibles de la metadata. */
function sanitizeMeta(meta: AuthLogMeta): AuthLogMeta {
  const safe: AuthLogMeta = {};
  for (const [key, value] of Object.entries(meta)) {
    safe[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : value;
  }
  return safe;
}

/**
 * Registra un error de autenticación de forma estructurada y segura.
 *
 * @param context Identificador estable del punto de fallo, con formato
 *   `área:acción` (ej. `"callback:exchange"`, `"login:password"`,
 *   `"perfil:unlink-google"`). Sirve para agrupar en el sistema de logs.
 * @param error El error original (Error, AuthError de Supabase o unknown).
 * @param meta Contexto adicional NO sensible (flujo, provider, ruta, etc.).
 *   Las claves tipo token/code/password se redactan automáticamente.
 */
export function logAuthError(
  context: string,
  error: unknown,
  meta: AuthLogMeta = {},
): void {
  const payload = {
    context,
    ...serializeError(error),
    ...sanitizeMeta(meta),
    at: new Date().toISOString(),
  };
  console.error(`[auth] ${context}`, JSON.stringify(payload));
}
