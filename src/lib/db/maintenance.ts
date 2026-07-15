import "server-only";
import { and, lt, ne, notExists, or, sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, jobs } from "@/lib/db/schema";
import { createServiceClient } from "@/lib/supabase/server";
import { logAuthError } from "@/lib/auth-log";

/**
 * Mantenimiento de cuentas huérfanas (Drizzle).
 *
 * Un perfil es "huérfano" cuando el usuario se registró pero NUNCA completó
 * el onboarding obligatorio de /completar-perfil: le falta nombre o teléfono
 * tras un período de gracia (default 48 h). El caso típico es el registro
 * OAuth (Google), que no aporta teléfono; el registro con contraseña exige
 * ambos campos, así que rara vez cae acá.
 *
 * Salvaguardas de purga:
 *  - Nunca admins.
 *  - Nunca perfiles con actividad (algún job como cliente o profesional).
 *  - Solo usuarios cuyo auth.users tiene identidad OAuth (google/apple/github),
 *    verificado vía Admin API (la tabla auth.users no está mapeada en Drizzle).
 *  - `dryRun` por defecto: listar sin borrar.
 */

/** Proveedores OAuth cuya falta de teléfono origina huérfanos. */
const OAUTH_PROVIDERS = ["google", "apple", "github"];

/** Período de gracia por defecto para completar el onboarding. */
export const ORPHAN_GRACE_HOURS = 48;

export type OrphanProfile = {
  id: string;
  role: "client" | "provider" | "admin";
  fullName: string | null;
  phone: string | null;
  createdAt: Date;
};

/**
 * Lista los perfiles con onboarding incompleto (sin nombre o sin teléfono),
 * creados hace más de `olderThanHours`, sin actividad y no-admin.
 * Solo lectura: no verifica todavía el origen OAuth (eso lo hace la purga,
 * que necesita la Admin API).
 */
export async function findOrphanProfiles({
  olderThanHours = ORPHAN_GRACE_HOURS,
  limit = 100,
}: {
  olderThanHours?: number;
  limit?: number;
} = {}): Promise<OrphanProfile[]> {
  const cutoff = new Date(Date.now() - olderThanHours * 3_600_000);

  return db
    .select({
      id: profiles.id,
      role: profiles.role,
      fullName: profiles.fullName,
      phone: profiles.phone,
      createdAt: profiles.createdAt,
    })
    .from(profiles)
    .where(
      and(
        lt(profiles.createdAt, cutoff),
        ne(profiles.role, "admin"),
        // Onboarding incompleto: nombre o teléfono vacío/nulo.
        or(
          sql`coalesce(trim(${profiles.fullName}), '') = ''`,
          sql`coalesce(trim(${profiles.phone}), '') = ''`,
        ),
        // Sin actividad: jamás participó de un pedido.
        notExists(
          db
            .select({ one: sql`1` })
            .from(jobs)
            .where(
              or(
                eq(jobs.clientId, profiles.id),
                eq(jobs.providerId, profiles.id),
              ),
            ),
        ),
      ),
    )
    .orderBy(profiles.createdAt)
    .limit(limit);
}

export type PurgeResult = {
  /** Candidatos detectados por la query (onboarding incompleto + >48 h). */
  scanned: number;
  /** IDs efectivamente purgados (auth.users + profiles). */
  purged: string[];
  /** IDs salteados y por qué (sin identidad OAuth, error de Admin API…). */
  skipped: { id: string; reason: string }[];
  /** true si fue una pasada de solo-lectura. */
  dryRun: boolean;
};

/**
 * Purga (o lista, con `dryRun`) las cuentas huérfanas de origen OAuth.
 *
 * Por cada candidato consulta la Admin API (service_role) y solo borra si
 * `app_metadata.providers` incluye un proveedor OAuth — así se respeta el
 * criterio "creados mediante registro OAuth" que la DB sola no puede ver.
 * El borrado va primero contra auth.users (Admin API) y después contra
 * `profiles` (por si no hay FK con cascade); `provider_profiles`,
 * `push_subscriptions` y `notifications` caen en cascada de `profiles`.
 *
 * @param dryRun default `true`: nunca borra salvo pedido explícito.
 */
export async function purgeOrphanProfiles({
  olderThanHours = ORPHAN_GRACE_HOURS,
  limit = 100,
  dryRun = true,
}: {
  olderThanHours?: number;
  limit?: number;
  dryRun?: boolean;
} = {}): Promise<PurgeResult> {
  const candidates = await findOrphanProfiles({ olderThanHours, limit });
  const result: PurgeResult = {
    scanned: candidates.length,
    purged: [],
    skipped: [],
    dryRun,
  };
  if (candidates.length === 0) return result;

  const service = createServiceClient();

  for (const candidate of candidates) {
    const { data, error } = await service.auth.admin.getUserById(candidate.id);
    if (error || !data.user) {
      result.skipped.push({
        id: candidate.id,
        reason: error?.message ?? "auth.users no encontrado",
      });
      continue;
    }

    const providers = (data.user.app_metadata?.providers ?? []) as string[];
    if (!providers.some((p) => OAUTH_PROVIDERS.includes(p))) {
      result.skipped.push({ id: candidate.id, reason: "sin identidad OAuth" });
      continue;
    }

    if (dryRun) {
      result.purged.push(candidate.id);
      continue;
    }

    const { error: deleteError } = await service.auth.admin.deleteUser(
      candidate.id,
    );
    if (deleteError) {
      logAuthError("maintenance:delete-user", deleteError, {
        userId: candidate.id,
      });
      result.skipped.push({ id: candidate.id, reason: deleteError.message });
      continue;
    }
    // Limpieza del perfil (por si el proyecto no tiene FK con cascade
    // entre auth.users y profiles). Idempotente si ya cayó en cascada.
    await db.delete(profiles).where(eq(profiles.id, candidate.id));
    result.purged.push(candidate.id);
  }

  return result;
}
