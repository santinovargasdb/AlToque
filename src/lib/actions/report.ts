"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  jobReports,
  jobs,
  providerProfiles,
  reviews,
  subscriptions,
} from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import {
  createReportSchema,
  isReportableStatus,
  NOT_COMPLETED_CANCEL_REASON,
  resolveReportSchema,
} from "@/lib/validations/report";
import { setPreApprovalStatus } from "@/lib/mercadopago/subscriptions";
import { notifyProviderSuspended } from "@/lib/notifications/verification";
import type { ActionResult } from "./provider";

export type SuspendResult =
  | { ok: true; warning?: string }
  | { ok: false; error: string };

/** Una parte del trabajo reporta a la otra. Una vez por parte y por trabajo. */
export async function createJobReport(input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "No autorizado." };
  const uid = session.user.id;

  const parsed = createReportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  const { jobId, reason, description } = parsed.data;

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

  const isClient = uid === job.clientId;
  const isProvider = uid === job.providerId;
  if (!isClient && !isProvider) return { ok: false, error: "No autorizado." };
  if (!job.providerId || !isReportableStatus(job.status)) {
    return { ok: false, error: "Este pedido todavía no se puede reportar." };
  }

  const created = await db
    .insert(jobReports)
    .values({
      jobId,
      reporterId: uid,
      targetId: isClient ? job.providerId : job.clientId,
      reason,
      description,
    })
    .onConflictDoNothing()
    .returning({ id: jobReports.id });
  if (created.length === 0) {
    return { ok: false, error: "Ya reportaste este trabajo." };
  }

  revalidatePath(`/pedido/${jobId}`);
  revalidatePath(`/pro/pedido/${jobId}`);
  revalidatePath("/admin/reportes");
  return { ok: true };
}

/**
 * Cierra un reporte abierto (admin), con una nota. Descartar el reporte de un
 * trabajo que el cliente cerró como "no se hizo" también borra su reseña: esa
 * nota solo existía porque el trabajo supuestamente no se hizo.
 */
export async function resolveReport(
  input: unknown,
  outcome: "resolved" | "dismissed",
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { ok: false, error: "No autorizado." };
  }

  const parsed = resolveReportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  const { reportId, note } = parsed.data;

  const closed = await db.transaction(async (tx) => {
    const [report] = await tx
      .update(jobReports)
      .set({
        status: outcome,
        adminNote: note,
        resolvedBy: session.user.id,
        resolvedAt: new Date(),
      })
      .where(and(eq(jobReports.id, reportId), eq(jobReports.status, "open")))
      .returning({
        jobId: jobReports.jobId,
        reporterId: jobReports.reporterId,
        targetId: jobReports.targetId,
      });
    if (!report) return false;
    if (outcome !== "dismissed") return true;

    const [job] = await tx
      .select({ clientId: jobs.clientId, cancelReason: jobs.cancelReason })
      .from(jobs)
      .where(eq(jobs.id, report.jobId))
      .limit(1);
    if (
      job?.cancelReason === NOT_COMPLETED_CANCEL_REASON &&
      job.clientId === report.reporterId
    ) {
      await tx
        .delete(reviews)
        .where(
          and(
            eq(reviews.jobId, report.jobId),
            eq(reviews.authorId, report.reporterId),
          ),
        );
      await tx
        .update(providerProfiles)
        .set({
          ratingAvg: sql`coalesce((
            select round(avg(${reviews.rating}), 1) from ${reviews}
            where ${reviews.targetId} = ${report.targetId}
          ), 0)`,
        })
        .where(eq(providerProfiles.profileId, report.targetId));
    }
    return true;
  });
  if (!closed) {
    return { ok: false, error: "El reporte ya estaba cerrado." };
  }

  revalidatePath("/admin/reportes");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Suspende al profesional reportado (admin). Reutiliza `rejected`, que ya lo saca
 * de la búsqueda y del despacho. La pausa en Mercado Pago va fuera de la
 * transacción: si falla, la suspensión queda y el admin recibe un aviso, porque
 * no puede seguir recibiendo pedidos aunque MP esté caído.
 */
export async function suspendReportedProvider(
  input: unknown,
): Promise<SuspendResult> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { ok: false, error: "No autorizado." };
  }

  const parsed = resolveReportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  const { reportId, note } = parsed.data;

  const [report] = await db
    .select({ targetId: jobReports.targetId, providerId: jobs.providerId })
    .from(jobReports)
    .innerJoin(jobs, eq(jobs.id, jobReports.jobId))
    .where(eq(jobReports.id, reportId))
    .limit(1);
  if (!report) return { ok: false, error: "Reporte no encontrado." };
  if (report.targetId !== report.providerId) {
    return { ok: false, error: "El reportado no es un profesional." };
  }
  const providerId = report.targetId;

  const suspended = await db.transaction(async (tx) => {
    const closed = await tx
      .update(jobReports)
      .set({
        status: "resolved",
        adminNote: `Profesional suspendido: ${note}`,
        resolvedBy: session.user.id,
        resolvedAt: new Date(),
      })
      .where(and(eq(jobReports.id, reportId), eq(jobReports.status, "open")))
      .returning({ id: jobReports.id });
    if (closed.length === 0) return false;

    await tx
      .update(providerProfiles)
      .set({
        verificationStatus: "rejected",
        rejectionReason: note,
        isOnline: false,
      })
      .where(eq(providerProfiles.profileId, providerId));
    return true;
  });
  if (!suspended) return { ok: false, error: "El reporte ya estaba cerrado." };

  const warning = await pauseProviderSubscription(providerId);

  try {
    await notifyProviderSuspended({ providerId, reason: note });
  } catch (err) {
    // La suspensión ya se aplicó: el aviso no puede hacerla fallar.
    console.error("[reports] no se pudo avisar la suspensión", err);
  }

  revalidatePath("/admin/reportes");
  revalidatePath("/admin/profesionales");
  revalidatePath("/admin");
  return warning ? { ok: true, warning } : { ok: true };
}

/** Frena los débitos de un suspendido. Devuelve un aviso si no se pudo. */
async function pauseProviderSubscription(
  providerId: string,
): Promise<string | undefined> {
  const [sub] = await db
    .select({
      id: subscriptions.id,
      mpPreapprovalId: subscriptions.mpPreapprovalId,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.profileId, providerId),
        eq(subscriptions.plan, "provider_monthly"),
        inArray(subscriptions.status, ["active", "past_due"]),
      ),
    )
    .limit(1);
  if (!sub) return undefined;

  if (sub.mpPreapprovalId) {
    try {
      await setPreApprovalStatus(sub.mpPreapprovalId, "paused");
    } catch {
      return "El profesional quedó suspendido, pero no pudimos pausar su suscripción en Mercado Pago. Pausala a mano para que no le sigan cobrando.";
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(subscriptions)
      .set({ status: "paused", updatedAt: new Date() })
      .where(eq(subscriptions.id, sub.id));
    await tx
      .update(providerProfiles)
      .set({ subscriptionActive: false })
      .where(eq(providerProfiles.profileId, providerId));
  });
  return undefined;
}
