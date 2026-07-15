"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { providerProfiles, commissionLedger } from "@/lib/db/schema";
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

/**
 * Marca como saldada una comisión adeudada (el profesional pagó su deuda
 * de un trabajo en efectivo). Solo transiciona desde 'owed'.
 */
export async function settleCommission(
  ledgerId: string,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { ok: false, error: "No autorizado." };
  }
  if (!idSchema.safeParse(ledgerId).success) {
    return { ok: false, error: "ID inválido." };
  }

  const rows = await db
    .update(commissionLedger)
    .set({ status: "settled", settledAt: new Date() })
    .where(
      and(eq(commissionLedger.id, ledgerId), eq(commissionLedger.status, "owed")),
    )
    .returning({ id: commissionLedger.id });
  if (rows.length === 0) {
    return { ok: false, error: "La comisión ya no está pendiente." };
  }

  revalidatePath("/admin/comisiones");
  revalidatePath("/pro/cobros");
  return { ok: true };
}
