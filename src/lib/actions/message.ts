"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs, messages, notifications } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { sendPushToUsers } from "@/lib/push/send";
import { sendMessageSchema } from "@/lib/validations/message";

/** Estados del job en los que el chat está activo. */
const CHATTABLE_STATUSES = ["accepted", "in_progress", "completed"] as const;

export type SentMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string; // ISO — serializable para el client component
};

export type SendMessageResult =
  | { ok: true; message: SentMessage }
  | { ok: false; error: string };

/**
 * Envía un mensaje del chat de un trabajo (Step 11). Solo las partes
 * (cliente o profesional asignado) y solo con el pedido activo/completado.
 * La entrega en vivo la hace Supabase Realtime (INSERT en `messages`);
 * acá además se notifica (in-app + push) a la contraparte.
 */
export async function sendMessage(input: unknown): Promise<SendMessageResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "No autorizado." };
  const uid = session.user.id;

  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Mensaje inválido.",
    };
  }
  const { jobId, body } = parsed.data;

  const [job] = await db
    .select({
      clientId: jobs.clientId,
      providerId: jobs.providerId,
      status: jobs.status,
      title: jobs.title,
    })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);
  if (!job) return { ok: false, error: "Pedido no encontrado." };

  const isClient = uid === job.clientId;
  const isProvider = uid === job.providerId;
  if (!isClient && !isProvider) return { ok: false, error: "No autorizado." };
  if (!CHATTABLE_STATUSES.includes(job.status as never)) {
    return { ok: false, error: "El chat no está disponible para este pedido." };
  }

  const [row] = await db
    .insert(messages)
    .values({ jobId, senderId: uid, body })
    .returning({
      id: messages.id,
      senderId: messages.senderId,
      body: messages.body,
      createdAt: messages.createdAt,
    });

  // Notificación a la contraparte (el tag colapsa pushes del mismo chat).
  const recipientId = isClient ? job.providerId : job.clientId;
  if (recipientId) {
    const url = isClient ? `/pro/pedido/${jobId}` : `/pedido/${jobId}`;
    await db.insert(notifications).values({
      userId: recipientId,
      type: "new_message",
      title: `Nuevo mensaje — ${job.title}`,
      body,
      data: { jobId },
    });
    await sendPushToUsers([recipientId], {
      title: `Nuevo mensaje — ${job.title}`,
      body: body.length > 120 ? `${body.slice(0, 117)}…` : body,
      url,
      tag: `chat-${jobId}`,
    });
  }

  return {
    ok: true,
    message: {
      id: row!.id,
      senderId: row!.senderId,
      body: row!.body,
      createdAt: row!.createdAt.toISOString(),
    },
  };
}
