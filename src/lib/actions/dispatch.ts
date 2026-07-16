"use server";

import { revalidatePath } from "next/cache";
import { sql, eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  jobs,
  jobDispatch,
  providerProfiles,
  categories,
  notifications,
} from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { sendPushToUsers } from "@/lib/push/send";
import type { ActionResult } from "./provider";

/** El profesional se pone online/offline para recibir urgencias. */
export async function toggleOnline(online: boolean): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return { ok: false, error: "No autorizado." };
  }
  await db
    .update(providerProfiles)
    .set({ isOnline: online })
    .where(eq(providerProfiles.profileId, session.user.id));
  revalidatePath("/pro/inicio");
  return { ok: true };
}

export type IncomingJob = {
  id: string;
  title: string;
  categoryName: string;
  addressText: string | null;
  distanceKm: number | null;
  createdAt: Date;
};

/** Pedidos urgentes en broadcast notificados a este profesional. */
export async function getIncomingJobs(): Promise<IncomingJob[]> {
  const session = await getSession();
  if (!session || session.role !== "provider") return [];

  const rows = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      addressText: jobs.addressText,
      createdAt: jobs.createdAt,
      categoryName: categories.name,
      distanceKm: jobDispatch.distanceKm,
    })
    .from(jobDispatch)
    .innerJoin(jobs, eq(jobs.id, jobDispatch.jobId))
    .innerJoin(categories, eq(categories.id, jobs.categoryId))
    .where(
      and(
        eq(jobDispatch.providerId, session.user.id),
        eq(jobDispatch.status, "notified"),
        eq(jobs.status, "broadcasting"),
      ),
    )
    .orderBy(desc(jobs.createdAt));

  return rows.map((r) => ({
    ...r,
    distanceKm: r.distanceKm != null ? Number(r.distanceKm) : null,
  }));
}

/**
 * Aceptar un pedido urgente — RACE-SAFE.
 * El `WHERE status = 'broadcasting'` garantiza "el primero que acepta gana"
 * a nivel DB, sin locks de aplicación.
 */
export async function acceptJob(jobId: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return { ok: false, error: "No autorizado." };
  }
  const uid = session.user.id;

  const updated = (await db.execute(
    sql`update jobs
        set provider_id = ${uid}, status = 'accepted',
            accepted_at = now(), updated_at = now()
        where id = ${jobId} and status = 'broadcasting'
        returning id, client_id`,
  )) as unknown as { id: string; client_id: string }[];

  if (updated.length === 0) {
    return { ok: false, error: "Otro profesional ya tomó este pedido." };
  }
  const clientId = updated[0]!.client_id;

  // Mi dispatch → accepted; el resto → expired.
  await db
    .update(jobDispatch)
    .set({ status: "accepted", respondedAt: new Date() })
    .where(
      and(eq(jobDispatch.jobId, jobId), eq(jobDispatch.providerId, uid)),
    );
  await db.execute(
    sql`update job_dispatch set status = 'expired', responded_at = now()
        where job_id = ${jobId} and provider_id <> ${uid} and status = 'notified'`,
  );

  // Avisar al cliente: in-app + Web Push (por si no tiene la pestaña abierta).
  await db.insert(notifications).values({
    userId: clientId,
    type: "job_accepted",
    title: "¡Tu pedido fue aceptado!",
    body: "Un profesional ya está en camino.",
    link: `/pedido/${jobId}`,
    data: { jobId },
  });
  await sendPushToUsers([clientId], {
    title: "¡Tu pedido fue aceptado!",
    body: "Un profesional aceptó tu pedido.",
    url: `/pedido/${jobId}`,
    tag: `job-${jobId}`,
  });

  revalidatePath("/pro/inicio");
  revalidatePath(`/pro/pedido/${jobId}`);
  revalidatePath(`/pedido/${jobId}`);
  return { ok: true };
}

/** El profesional rechaza un pedido urgente que le llegó. */
export async function declineJob(jobId: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return { ok: false, error: "No autorizado." };
  }
  await db
    .update(jobDispatch)
    .set({ status: "declined", respondedAt: new Date() })
    .where(
      and(
        eq(jobDispatch.jobId, jobId),
        eq(jobDispatch.providerId, session.user.id),
      ),
    );
  revalidatePath("/pro/inicio");
  return { ok: true };
}
