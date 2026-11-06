"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  jobReports,
  jobs,
  notifications,
  providerProfiles,
} from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { sendPushToUsers } from "@/lib/push/send";
import {
  closeJobSchema,
  NOT_COMPLETED_CANCEL_REASON,
} from "@/lib/validations/report";
import type { ActionResult } from "./provider";

/**
 * El cliente cierra un trabajo aceptado o en curso. Sin esto, solo el profesional
 * podía completarlo, y uno que no cumplía evitaba la reseña:
 *  - "se hizo": `completed`, suma a `jobs_completed` y habilita las reseñas.
 *  - "no se hizo": `cancelled` con `not_completed`, más un reporte contra el
 *    profesional. Si el cliente ya había reportado, queda ese reporte.
 * Race-safe: un doble envío o un cierre simultáneo no cuentan dos veces.
 */
export async function closeJobAsClient(input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "client") {
    return { ok: false, error: "No autorizado." };
  }
  const uid = session.user.id;

  const parsed = closeJobSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  const data = parsed.data;

  const [job] = await db
    .select({ clientId: jobs.clientId, providerId: jobs.providerId })
    .from(jobs)
    .where(eq(jobs.id, data.jobId))
    .limit(1);
  if (!job) return { ok: false, error: "Pedido no encontrado." };
  if (job.clientId !== uid) return { ok: false, error: "No autorizado." };
  const providerId = job.providerId;
  if (!providerId) {
    return { ok: false, error: "Este pedido no se puede cerrar." };
  }

  const now = new Date();
  const closed = await db.transaction(async (tx) => {
    const changed = await tx
      .update(jobs)
      .set(
        data.outcome === "done"
          ? { status: "completed", completedAt: now, updatedAt: now }
          : {
              status: "cancelled",
              cancelReason: NOT_COMPLETED_CANCEL_REASON,
              updatedAt: now,
            },
      )
      .where(
        and(
          eq(jobs.id, data.jobId),
          inArray(jobs.status, ["accepted", "in_progress"]),
        ),
      )
      .returning({ id: jobs.id });
    if (changed.length === 0) return false;

    if (data.outcome === "done") {
      await tx
        .update(providerProfiles)
        .set({ jobsCompleted: sql`${providerProfiles.jobsCompleted} + 1` })
        .where(eq(providerProfiles.profileId, providerId));
    } else {
      await tx
        .insert(jobReports)
        .values({
          jobId: data.jobId,
          reporterId: uid,
          targetId: providerId,
          reason: data.reason,
          description: data.description,
        })
        .onConflictDoNothing();
    }
    return true;
  });
  if (!closed) {
    return { ok: false, error: "El pedido cambió de estado. Recargá la página." };
  }

  await notifyProviderJobClosed(providerId, data.jobId, data.outcome);

  revalidatePath(`/pedido/${data.jobId}`);
  revalidatePath(`/pro/pedido/${data.jobId}`);
  revalidatePath("/pedidos");
  revalidatePath("/pro/pedidos");
  revalidatePath("/pro/inicio");
  revalidatePath("/admin/reportes");
  return { ok: true };
}

/** El cierre ya se confirmó: un fallo al avisar no puede hacerlo fallar. */
async function notifyProviderJobClosed(
  providerId: string,
  jobId: string,
  outcome: "done" | "not_done",
): Promise<void> {
  const title =
    outcome === "done"
      ? "El cliente marcó el trabajo como terminado"
      : "El cliente informó que el trabajo no se hizo";
  const body =
    outcome === "done"
      ? "Ya podés dejarle tu reseña."
      : "El equipo de AlToque va a revisar el caso. Si no fue así, reportalo desde el pedido.";
  const link = `/pro/pedido/${jobId}`;
  try {
    await db.insert(notifications).values({
      userId: providerId,
      type: "job_closed_by_client",
      title,
      body,
      link,
      data: { jobId },
    });
    await sendPushToUsers([providerId], {
      title,
      body,
      url: link,
      tag: `job-${jobId}`,
    });
  } catch (err) {
    console.error("[jobs] no se pudo avisar el cierre", err);
  }
}
