"use server";

import { revalidatePath } from "next/cache";
import { and, avg, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs, reviews, providerProfiles } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { reviewSchema } from "@/lib/validations/job";
import type { ActionResult } from "./provider";

/**
 * Reseña bidireccional de un trabajo completado (Step 10). Una por parte
 * (unique job+author en DB). El target queda fijado por el rol en el job:
 * el cliente reseña al profesional y viceversa (no se acepta otro target).
 * Si el reseñado es el profesional, recalcula su rating_avg.
 */
export async function submitReview(input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "No autorizado." };
  const uid = session.user.id;

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  const { jobId, targetId, rating, comment } = parsed.data;

  const [job] = await db
    .select({
      clientId: jobs.clientId,
      providerId: jobs.providerId,
      status: jobs.status,
    })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);
  if (!job) return { ok: false, error: "Pedido no encontrado." };
  if (job.status !== "completed") {
    return { ok: false, error: "Solo se puede reseñar un trabajo completado." };
  }

  const isClient = uid === job.clientId;
  const isProvider = uid === job.providerId;
  if (!isClient && !isProvider) return { ok: false, error: "No autorizado." };

  const expectedTarget = isClient ? job.providerId : job.clientId;
  if (!expectedTarget || targetId !== expectedTarget) {
    return { ok: false, error: "Reseña inválida." };
  }

  const [existing] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.jobId, jobId), eq(reviews.authorId, uid)))
    .limit(1);
  if (existing) {
    return { ok: false, error: "Ya dejaste tu reseña para este trabajo." };
  }

  await db.transaction(async (tx) => {
    await tx.insert(reviews).values({
      jobId,
      authorId: uid,
      targetId,
      rating,
      comment: comment?.trim() || null,
    });

    // El rating del profesional vive en provider_profiles (promedio 1 decimal).
    if (targetId === job.providerId) {
      const [agg] = await tx
        .select({ average: avg(reviews.rating) })
        .from(reviews)
        .where(eq(reviews.targetId, targetId));
      await tx
        .update(providerProfiles)
        .set({ ratingAvg: sql`round(${Number(agg?.average ?? rating)}::numeric, 1)` })
        .where(eq(providerProfiles.profileId, targetId));
    }
  });

  revalidatePath(`/pedido/${jobId}`);
  revalidatePath(`/pro/pedido/${jobId}`);
  revalidatePath(`/profesional/${targetId}`);
  return { ok: true };
}
