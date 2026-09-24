import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications, profiles } from "@/lib/db/schema";
import { sendPushToUsers } from "@/lib/push/send";
import { sendEmail } from "@/lib/emails/send";
import { verificationResultEmail } from "@/lib/emails/verification-result";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Avisa al profesional el resultado de su verificación por los tres
 * canales: campanita in-app, Web Push y email. El email es best-effort
 * (resuelve la dirección vía Admin API); in-app y push nunca dependen
 * de que el email salga.
 */
export async function notifyVerificationResult(params: {
  providerId: string;
  status: "approved" | "rejected";
  reason?: string;
}): Promise<void> {
  const approved = params.status === "approved";
  const title = approved
    ? "¡Tu verificación fue aprobada!"
    : "Tu verificación fue rechazada";
  const body = approved
    ? "Ya aparecés en las búsquedas. Ponete en línea para recibir urgencias."
    : `Motivo: ${params.reason ?? "documentos ilegibles o incompletos."} Corregilo y reenviá los documentos.`;
  const link = approved ? "/pro/inicio" : "/pro/verificacion";

  await db.insert(notifications).values({
    userId: params.providerId,
    type: "verification_result",
    title,
    body,
    link,
    data: { status: params.status },
  });

  await sendPushToUsers([params.providerId], {
    title,
    body,
    url: link,
    tag: "verification-result",
  });

  // Email best-effort: jamás rompe el flujo del admin.
  try {
    const [profile] = await db
      .select({ fullName: profiles.fullName })
      .from(profiles)
      .where(eq(profiles.id, params.providerId))
      .limit(1);

    const supabase = createServiceClient();
    const { data } = await supabase.auth.admin.getUserById(params.providerId);
    const email = data?.user?.email;
    if (!email) return;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const { subject, html } = verificationResultEmail({
      name: profile?.fullName ?? "profesional",
      status: params.status,
      reason: params.reason,
      appUrl,
    });
    await sendEmail({ to: email, subject, html });
  } catch (err) {
    console.error("[verification] fallo al preparar el email de resultado:", err);
  }
}
