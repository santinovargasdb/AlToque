import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { parseUserAgent } from "@/lib/security-utils";

/**
 * Registro de auditoría de seguridad (audit trail).
 *
 * Principios:
 *  - **Nunca bloquea ni rompe** el flujo principal: todo error se traga y
 *    se reporta a la consola. Llamar con `void logSecurityEvent(...)` para
 *    no esperar el INSERT (fire-and-forget).
 *  - **Sin datos sensibles**: la metadata se redacta con la misma regla del
 *    logger de auth (claves token/code/password/etc.) y los emails se
 *    enmascaran con `maskEmail`.
 *  - **Inmutable**: solo INSERT server-side; el cliente lee únicamente sus
 *    propias filas vía RLS (docs/audit-notifications-setup.sql).
 */

/** Acciones críticas auditadas (texto libre en DB; este union documenta). */
export type SecurityAction =
  | "login"
  | "failed_login"
  | "signup"
  | "logout"
  | "logout_all"
  | "password_change"
  | "password_reset_request"
  | "identity_link"
  | "identity_unlink"
  | "profile_update";

type AuditMeta = Record<string, string | number | boolean | null | undefined>;

const SENSITIVE_KEY = /token|code|secret|password|key|hash|authorization/i;

/** Redacta claves sensibles de la metadata (defensa en profundidad). */
function sanitizeMeta(meta: AuditMeta): AuditMeta {
  const safe: AuditMeta = {};
  for (const [key, value] of Object.entries(meta)) {
    safe[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : value;
  }
  return safe;
}

/** IP + user-agent de la request actual (detrás del proxy de Vercel). */
export async function getRequestContext(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
}> {
  const h = await headers();
  // x-forwarded-for = "cliente, proxy1, proxy2" → el primer hop es el real.
  const forwarded = h.get("x-forwarded-for");
  const ipAddress =
    forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  return { ipAddress, userAgent: h.get("user-agent") };
}

/**
 * Registra un evento de seguridad. Seguro por diseño: valida nada contra el
 * usuario (es un log), jamás lanza y no bloquea si se invoca con `void`.
 *
 * @param action Acción crítica (ver SecurityAction).
 * @param params.userId Uid del afectado (null en eventos pre-login).
 * @param params.metadata Datos extra NO sensibles (se redacta igual).
 */
export async function logSecurityEvent(
  action: SecurityAction,
  params: { userId?: string | null; metadata?: AuditMeta } = {},
): Promise<void> {
  try {
    const { ipAddress, userAgent } = await getRequestContext();
    await db.insert(auditLogs).values({
      userId: params.userId ?? null,
      action,
      ipAddress,
      userAgent,
      metadata: params.metadata ? sanitizeMeta(params.metadata) : null,
    });
  } catch (err) {
    // El audit trail nunca tira abajo la operación del usuario.
    console.error("[audit] no se pudo registrar el evento", action, err);
  }
}

export type SecurityActivityRow = {
  id: string;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
};

/** Últimos eventos de seguridad del usuario (para "Actividad de seguridad"). */
export async function getRecentSecurityActivity(
  userId: string,
  limit = 5,
): Promise<SecurityActivityRow[]> {
  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

/**
 * ¿Este login viene de un contexto nuevo (IP y browser nunca vistos en los
 * logins previos del usuario)? Se usa para disparar el email de alerta de
 * seguridad. Ante cualquier duda (sin datos, primer login) devuelve false:
 * mejor no alarmar en el primer ingreso de una cuenta recién creada.
 */
export async function isNewLoginContext(userId: string): Promise<boolean> {
  try {
    const { ipAddress, userAgent } = await getRequestContext();
    if (!ipAddress && !userAgent) return false;

    const previous = await db
      .select({ ip: auditLogs.ipAddress, ua: auditLogs.userAgent })
      .from(auditLogs)
      .where(and(eq(auditLogs.userId, userId), eq(auditLogs.action, "login")))
      .orderBy(desc(auditLogs.createdAt))
      .limit(20);

    if (previous.length === 0) return false; // primer login: sin alerta
    return !previous.some(
      (p) => p.ip === ipAddress && sameBrowser(p.ua, userAgent),
    );
  } catch {
    return false;
  }
}

function sameBrowser(a: string | null, b: string | null): boolean {
  const da = parseUserAgent(a);
  const db_ = parseUserAgent(b);
  return da.browser === db_.browser && da.os === db_.os;
}
