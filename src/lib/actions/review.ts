"use server";

import { revalidatePath } from "next/cache";
import { and, avg, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobReports, jobs, reviews, reviewAspects, profiles, providerProfiles } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { reviewSchema } from "@/lib/validations/job";
import { NOT_COMPLETED_CANCEL_REASON } from "@/lib/validations/report";
import {
  aspectKeysFor,
  generalFromAspects,
  type AspectKey,
  type ReviewDirection,
} from "@/lib/reviews/aspects";
import type { ActionResult } from "./provider";

/**
 * Reseña bidireccional de un trabajo completado. Una por parte (unique
 * job+author). Si el cliente cerró el trabajo como "no se hizo", solo él reseña,
 * y no puede volver a hacerlo si un admin descartó su reporte.
 * El cliente puntúa al profesional y viceversa; el set de
 * aspectos depende de la dirección y se valida server-side (no se confía
 * en el cliente). La nota general = promedio de los 4 aspectos. Recalcula
 * el rating agregado del reseñado (pro en provider_profiles, cliente en
 * profiles).
 */
export async function submitReview(input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "No autorizado." };
  const uid = session.user.id;

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { jobId, targetId, aspects, comment } = parsed.data;

  const [job] = await db
    .select({
      clientId: jobs.clientId,
      providerId: jobs.providerId,
      status: jobs.status,
      cancelReason: jobs.cancelReason,
    })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);
  if (!job) return { ok: false, error: "Pedido no encontrado." };
  const notCompleted =
    job.status === "cancelled" &&
    job.cancelReason === NOT_COMPLETED_CANCEL_REASON;
  if (job.status !== "completed" && !notCompleted) {
    return { ok: false, error: "Solo se puede reseñar un trabajo completado." };
  }

  const isClient = uid === job.clientId;
  const isProvider = uid === job.providerId;
  if (!isClient && !isProvider) return { ok: false, error: "No autorizado." };

  if (notCompleted) {
    if (!isClient) {
      return { ok: false, error: "Solo se puede reseñar un trabajo completado." };
    }
    const [dismissed] = await db
      .select({ id: jobReports.id })
      .from(jobReports)
      .where(
        and(
          eq(jobReports.jobId, jobId),
          eq(jobReports.reporterId, uid),
          eq(jobReports.status, "dismissed"),
        ),
      )
      .limit(1);
    if (dismissed) {
      return { ok: false, error: "Tu reporte sobre este trabajo fue descartado." };
    }
  }

  const expectedTarget = isClient ? job.providerId : job.clientId;
  if (!expectedTarget || targetId !== expectedTarget) {
    return { ok: false, error: "Reseña inválida." };
  }

  // El set de aspectos debe ser EXACTAMENTE el de la dirección.
  const direction: ReviewDirection = isClient ? "client_to_provider" : "provider_to_client";
  const expectedKeys = aspectKeysFor(direction);
  const gotKeys = Object.keys(aspects);
  const sameSet =
    gotKeys.length === expectedKeys.length &&
    expectedKeys.every((k) => k in aspects);
  if (!sameSet) return { ok: false, error: "Reseña inválida." };

  const [existing] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.jobId, jobId), eq(reviews.authorId, uid)))
    .limit(1);
  if (existing) return { ok: false, error: "Ya dejaste tu reseña para este trabajo." };

  const general = generalFromAspects(expectedKeys.map((k) => aspects[k]!));
  const targetIsProvider = targetId === job.providerId;

  try {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(reviews)
      .values({
        jobId,
        authorId: uid,
        targetId,
        rating: String(general), // numeric column → string
        comment: comment?.trim() || null,
      })
      .returning({ id: reviews.id });

    if (!row) throw new Error("No se pudo crear la reseña.");

    await tx.insert(reviewAspects).values(
      expectedKeys.map((k) => ({
        reviewId: row.id,
        aspect: k as AspectKey,
        score: aspects[k]!,
      })),
    );

    // Recalcular el agregado del reseñado (promedio de las notas generales).
    const [agg] = await tx
      .select({ average: avg(reviews.rating), count: sql<number>`count(*)::int` })
      .from(reviews)
      .where(eq(reviews.targetId, targetId));
    const avgStr = sql`round(${Number(agg?.average ?? general)}::numeric, 1)`;
    const count = Number(agg?.count ?? 1);

    if (targetIsProvider) {
      await tx
        .update(providerProfiles)
        .set({ ratingAvg: avgStr })
        .where(eq(providerProfiles.profileId, targetId));
    } else {
      await tx
        .update(profiles)
        .set({ ratingAvg: avgStr, ratingCount: count })
        .where(eq(profiles.id, targetId));
    }
  });
  } catch (err) {
    // Carrera: dos reseñas del mismo autor para el mismo trabajo. El índice
    // único uq_review_job_author(job_id, author_id) protege la integridad;
    // acá mapeamos el 23505 al mismo mensaje amigable del pre-check.
    if (
      err !== null &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "23505"
    ) {
      return { ok: false, error: "Ya dejaste tu reseña para este trabajo." };
    }
    throw err;
  }

  revalidatePath(`/pedido/${jobId}`);
  revalidatePath(`/pro/pedido/${jobId}`);
  revalidatePath(`/profesional/${targetId}`);
  return { ok: true };
}
