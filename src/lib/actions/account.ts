"use server";

import { redirect } from "next/navigation";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  jobs,
  jobDispatch,
  messages,
  notifications,
  profiles,
  providerCategories,
  providerProfiles,
  pushSubscriptions,
  reviews,
  subscriptions,
} from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { setPreApprovalStatus } from "@/lib/mercadopago/subscriptions";
import { BUCKETS } from "@/lib/storage-buckets";
import { logSecurityEvent } from "@/lib/audit";
import {
  ACCOUNT_DELETED_CANCEL_REASON,
  DELETED_ACCOUNT_NAME,
  deleteAccountSchema,
} from "@/lib/validations/account";

export type DeleteAccountResult = { ok: false; error: string };

/** Borra todos los archivos de la carpeta del usuario en un bucket. */
async function removeUserFolder(
  service: ReturnType<typeof createServiceClient>,
  bucket: string,
  uid: string,
): Promise<void> {
  const { data, error } = await service.storage
    .from(bucket)
    .list(uid, { limit: 1000 });
  if (error) throw error;
  if (!data || data.length === 0) return;
  const { error: removeError } = await service.storage
    .from(bucket)
    .remove(data.map((file) => `${uid}/${file.name}`));
  if (removeError) throw removeError;
}

/**
 * Baja de la cuenta pedida por el propio usuario (requisito de Google Play y
 * derecho de supresión de la Ley 25.326).
 *
 * - Con trabajos en curso (`accepted`/`in_progress`) no se puede: hay otra
 *   persona esperando ese trabajo.
 * - Las suscripciones se cancelan en Mercado Pago ANTES de tocar nada: si eso
 *   falla se aborta, para no dejar un débito activo sobre una cuenta borrada.
 * - Sin historial, el perfil se borra entero. Con historial (pedidos, reseñas
 *   o mensajes) se anonimiza: esos registros son también de la otra parte y
 *   la política de privacidad los conserva hasta 5 años.
 * - Los documentos de verificación y el avatar se borran del Storage.
 *
 * En éxito redirige a /ingresar; solo devuelve valor si falló.
 */
export async function deleteAccount(
  input: unknown,
): Promise<DeleteAccountResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "No autorizado." };
  if (session.role === "admin") {
    return {
      ok: false,
      error: "Las cuentas de administración no se eliminan desde la app.",
    };
  }

  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Confirmación inválida.",
    };
  }

  const uid = session.user.id;
  const isParty = or(eq(jobs.clientId, uid), eq(jobs.providerId, uid));

  const [inFlight] = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(inArray(jobs.status, ["accepted", "in_progress"]), isParty))
    .limit(1);
  if (inFlight) {
    return {
      ok: false,
      error:
        "Tenés trabajos en curso. Terminalos o cancelalos antes de eliminar tu cuenta.",
    };
  }

  const subs = await db
    .select({
      status: subscriptions.status,
      mpPreapprovalId: subscriptions.mpPreapprovalId,
    })
    .from(subscriptions)
    .where(eq(subscriptions.profileId, uid));
  for (const sub of subs) {
    if (!sub.mpPreapprovalId || sub.status === "cancelled") continue;
    try {
      await setPreApprovalStatus(sub.mpPreapprovalId, "cancelled");
    } catch (error) {
      console.error("[cuenta] no se pudo cancelar la suscripción en MP", {
        preapprovalId: sub.mpPreapprovalId,
        message: error instanceof Error ? error.message : String(error),
      });
      // Una `pending` nunca autorizó el pago: no hay débito que frenar.
      if (sub.status !== "pending") {
        return {
          ok: false,
          error:
            "No pudimos cancelar tu suscripción en Mercado Pago. Probá de nuevo en unos minutos.",
        };
      }
    }
  }

  const anonymized = await db.transaction(async (tx) => {
    // Pedidos abiertos que todavía nadie tomó: se cancelan y se avisa.
    const cancelled = await tx
      .update(jobs)
      .set({
        status: "cancelled",
        cancelReason: ACCOUNT_DELETED_CANCEL_REASON,
        updatedAt: new Date(),
      })
      .where(and(inArray(jobs.status, ["requested", "broadcasting"]), isParty))
      .returning({ id: jobs.id, clientId: jobs.clientId });

    if (cancelled.length > 0) {
      await tx
        .update(jobDispatch)
        .set({ status: "expired", respondedAt: new Date() })
        .where(
          and(
            inArray(
              jobDispatch.jobId,
              cancelled.map((job) => job.id),
            ),
            eq(jobDispatch.status, "notified"),
          ),
        );
      const waitingClients = cancelled.filter((job) => job.clientId !== uid);
      if (waitingClients.length > 0) {
        await tx.insert(notifications).values(
          waitingClients.map((job) => ({
            userId: job.clientId,
            type: "job_cancelled",
            title: "Tu pedido fue cancelado",
            body: "El profesional ya no está disponible. Podés pedirlo a otro.",
            link: `/pedido/${job.id}`,
          })),
        );
      }
    }

    await tx.delete(jobDispatch).where(eq(jobDispatch.providerId, uid));
    await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, uid));
    await tx.delete(notifications).where(eq(notifications.userId, uid));
    await tx.delete(subscriptions).where(eq(subscriptions.profileId, uid));
    await tx
      .delete(providerCategories)
      .where(eq(providerCategories.providerId, uid));

    const [job] = await tx
      .select({ id: jobs.id })
      .from(jobs)
      .where(isParty)
      .limit(1);
    const [review] = await tx
      .select({ id: reviews.id })
      .from(reviews)
      .where(or(eq(reviews.authorId, uid), eq(reviews.targetId, uid)))
      .limit(1);
    const [message] = await tx
      .select({ id: messages.id })
      .from(messages)
      .where(eq(messages.senderId, uid))
      .limit(1);

    if (!job && !review && !message) {
      await tx
        .delete(providerProfiles)
        .where(eq(providerProfiles.profileId, uid));
      await tx.delete(profiles).where(eq(profiles.id, uid));
      return false;
    }

    // Con historial: la fila queda (la referencian pedidos y reseñas de la otra
    // parte) pero sin datos personales, y el profesional sale de toda búsqueda.
    await tx
      .update(providerProfiles)
      .set({
        bio: null,
        idDocumentUrl: null,
        idDocumentBackUrl: null,
        selfieUrl: null,
        licenseUrl: null,
        baseLocation: null,
        isOnline: false,
        subscriptionActive: false,
        verificationStatus: "rejected",
        rejectionReason: "Cuenta eliminada por el usuario.",
      })
      .where(eq(providerProfiles.profileId, uid));
    await tx
      .update(profiles)
      .set({
        fullName: DELETED_ACCOUNT_NAME,
        phone: null,
        avatarUrl: null,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, uid));
    return true;
  });

  const service = createServiceClient();

  // Best-effort: si falla queda registrado para limpiarlo a mano.
  for (const bucket of [BUCKETS.verification, BUCKETS.avatars]) {
    try {
      await removeUserFolder(service, bucket, uid);
    } catch (error) {
      console.error("[cuenta] quedaron archivos sin borrar", {
        bucket,
        userId: uid,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Primero se cierra la sesión local: con el usuario ya borrado, Supabase
  // puede rechazar el signOut y dejar la cookie.
  const supabase = await createClient();
  await supabase.auth.signOut();

  const { error: deleteError } = await service.auth.admin.deleteUser(uid);
  if (deleteError) {
    console.error("[cuenta] no se pudo borrar el usuario de auth", {
      userId: uid,
      message: deleteError.message,
    });
    return {
      ok: false,
      error:
        "Borramos tus datos, pero no pudimos cerrar el acceso. Escribinos a altoquecorp@gmail.com para terminarlo.",
    };
  }

  logSecurityEvent("account_delete", {
    userId: uid,
    metadata: { role: session.role, anonymized },
  });

  redirect(
    `/ingresar?notice=${encodeURIComponent("Tu cuenta fue eliminada.")}`,
  );
}
