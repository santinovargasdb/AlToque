import "server-only";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { sendPushToUsers } from "@/lib/push/send";

/**
 * Orquesta el despacho de un pedido urgente a los profesionales cercanos.
 *
 * La entrega EN VIVO al feed del profesional ocurre por Supabase Realtime
 * sobre `job_dispatch` (los providers se suscriben a sus filas). Acá creamos
 * además la notificación in-app y disparamos el Web Push (para cuando no
 * tienen la pestaña abierta). El email se agrega en el Step 11.
 */
export async function dispatchNewUrgentJob(params: {
  jobId: string;
  title: string;
  providerIds: string[];
}) {
  if (params.providerIds.length === 0) return;

  await db.insert(notifications).values(
    params.providerIds.map((uid) => ({
      userId: uid,
      type: "new_urgent_job",
      title: "Nuevo pedido urgente cerca tuyo",
      body: params.title,
      link: "/pro/inicio",
      data: { jobId: params.jobId },
    })),
  );

  await sendPushToUsers(params.providerIds, {
    title: "Nuevo pedido urgente cerca tuyo",
    body: params.title,
    url: "/pro/inicio",
    tag: `job-${params.jobId}`,
  });

  // TODO Step 11: email a través de Resend si corresponde.
}
