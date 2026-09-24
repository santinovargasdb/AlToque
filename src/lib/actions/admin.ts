"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { providerProfiles } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { rejectionReasonSchema } from "@/lib/validations/provider";
import { notifyVerificationResult } from "@/lib/notifications/verification";
import type { ActionResult } from "./provider";

const idSchema = z.string().uuid();

/** Aprueba la verificación de un profesional (admin) y le avisa. */
export async function approveProvider(
  providerId: string,
): Promise<ActionResult> {
  return setVerification(providerId, "approved");
}

/** Rechaza la verificación con un motivo accionable (admin) y le avisa. */
export async function rejectProvider(
  providerId: string,
  reason: string,
): Promise<ActionResult> {
  const parsed = rejectionReasonSchema.safeParse(reason);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Motivo inválido.",
    };
  }
  return setVerification(providerId, "rejected", parsed.data);
}

async function setVerification(
  providerId: string,
  status: "approved" | "rejected",
  reason?: string,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { ok: false, error: "No autorizado." };
  }
  if (!idSchema.safeParse(providerId).success) {
    return { ok: false, error: "ID inválido." };
  }

  await db
    .update(providerProfiles)
    .set({
      verificationStatus: status,
      // Aprobar limpia el motivo del rechazo anterior.
      rejectionReason: status === "rejected" ? (reason ?? null) : null,
    })
    .where(eq(providerProfiles.profileId, providerId));

  await notifyVerificationResult({ providerId, status, reason });

  revalidatePath("/admin/verificaciones");
  return { ok: true };
}
