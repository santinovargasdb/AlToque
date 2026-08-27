"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { providerProfiles } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import type { ActionResult } from "./provider";

const idSchema = z.string().uuid();

/** Aprueba la verificación de un profesional (admin). */
export async function approveProvider(
  providerId: string,
): Promise<ActionResult> {
  return setVerification(providerId, "approved");
}

/** Rechaza la verificación de un profesional (admin). */
export async function rejectProvider(
  providerId: string,
): Promise<ActionResult> {
  return setVerification(providerId, "rejected");
}

async function setVerification(
  providerId: string,
  status: "approved" | "rejected",
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
    .set({ verificationStatus: status })
    .where(eq(providerProfiles.profileId, providerId));

  revalidatePath("/admin/verificaciones");
  return { ok: true };
}
