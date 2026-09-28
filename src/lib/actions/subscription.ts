"use server";

import { revalidatePath } from "next/cache";
import { eq, and, ne, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions, providerProfiles } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { createPreApproval } from "@/lib/mercadopago/subscriptions";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Precio fundador: primeros 50 profesionales activos
const FOUNDING_THRESHOLD = 50;
const PROVIDER_REGULAR_PRICE = 7000;
const PROVIDER_FOUNDING_PRICE = 5000;
const CLIENT_PRICE = 4500;

export type SubActionResult =
  | { ok: true; initPoint: string }
  | { ok: false; error: string };

async function countActiveProviderSubs(): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.plan, "provider_monthly"),
        ne(subscriptions.status, "cancelled"),
      ),
    );
  return Number(row?.n ?? 0);
}

/** Inicia el flujo de suscripción profesional → devuelve URL de MP. */
export async function startProviderSubscription(): Promise<SubActionResult> {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return { ok: false, error: "Solo los profesionales pueden suscribirse a este plan." };
  }

  const userId = session.user.id;
  const userEmail = session.user.email ?? "";

  const [existing] = await db
    .select({ status: subscriptions.status })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.profileId, userId),
        eq(subscriptions.plan, "provider_monthly"),
      ),
    )
    .limit(1);

  if (existing?.status === "active") {
    return { ok: false, error: "Ya tenés una suscripción activa." };
  }

  const n = await countActiveProviderSubs();
  const amount = n < FOUNDING_THRESHOLD ? PROVIDER_FOUNDING_PRICE : PROVIDER_REGULAR_PRICE;

  try {
    const { preapprovalId, initPoint } = await createPreApproval({
      payerEmail: userEmail,
      plan: "provider_monthly",
      amount,
      backUrl: `${APP_URL}/pro/suscripcion?status=pending`,
    });

    await db
      .insert(subscriptions)
      .values({
        profileId: userId,
        plan: "provider_monthly",
        status: "pending",
        mpPreapprovalId: preapprovalId,
      })
      .onConflictDoUpdate({
        target: [subscriptions.profileId, subscriptions.plan],
        set: {
          status: "pending",
          mpPreapprovalId: preapprovalId,
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        },
      });

    return { ok: true, initPoint };
  } catch {
    return { ok: false, error: "No pudimos crear la suscripción. Intentá nuevamente." };
  }
}

/** Inicia el flujo de suscripción cliente Premium → devuelve URL de MP. */
export async function startClientSubscription(): Promise<SubActionResult> {
  const session = await getSession();
  if (!session || session.role !== "client") {
    return { ok: false, error: "Solo los clientes pueden suscribirse a este plan." };
  }

  const userId = session.user.id;
  const userEmail = session.user.email ?? "";

  const [existing] = await db
    .select({ status: subscriptions.status })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.profileId, userId),
        eq(subscriptions.plan, "client_monthly"),
      ),
    )
    .limit(1);

  if (existing?.status === "active") {
    return { ok: false, error: "Ya tenés una suscripción activa." };
  }

  try {
    const { preapprovalId, initPoint } = await createPreApproval({
      payerEmail: userEmail,
      plan: "client_monthly",
      amount: CLIENT_PRICE,
      backUrl: `${APP_URL}/suscripcion?status=pending`,
    });

    await db
      .insert(subscriptions)
      .values({
        profileId: userId,
        plan: "client_monthly",
        status: "pending",
        mpPreapprovalId: preapprovalId,
      })
      .onConflictDoUpdate({
        target: [subscriptions.profileId, subscriptions.plan],
        set: {
          status: "pending",
          mpPreapprovalId: preapprovalId,
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        },
      });

    return { ok: true, initPoint };
  } catch {
    return { ok: false, error: "No pudimos crear la suscripción. Intentá nuevamente." };
  }
}

/** Marca la suscripción para no renovar al vencimiento. */
export async function cancelSubscriptionAtPeriodEnd(
  plan: "provider_monthly" | "client_monthly",
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sesión inválida." };

  await db
    .update(subscriptions)
    .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
    .where(
      and(
        eq(subscriptions.profileId, session.user.id),
        eq(subscriptions.plan, plan),
        eq(subscriptions.status, "active"),
      ),
    );

  revalidatePath(plan === "provider_monthly" ? "/pro/suscripcion" : "/suscripcion");
  return { ok: true };
}

/** Reactiva la renovación automática si estaba marcada para cancelar. */
export async function resumeSubscription(
  plan: "provider_monthly" | "client_monthly",
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sesión inválida." };

  await db
    .update(subscriptions)
    .set({ cancelAtPeriodEnd: false, updatedAt: new Date() })
    .where(
      and(
        eq(subscriptions.profileId, session.user.id),
        eq(subscriptions.plan, plan),
        eq(subscriptions.status, "active"),
      ),
    );

  revalidatePath(plan === "provider_monthly" ? "/pro/suscripcion" : "/suscripcion");
  return { ok: true };
}

/**
 * Procesa un evento de preapproval recibido desde el webhook de MP.
 * Actualiza el estado de la suscripción y sincroniza `subscription_active`
 * en provider_profiles para el gate del matching.
 * Idempotente: actualizar el mismo estado dos veces es seguro.
 */
export async function processPreapprovalEvent(
  preapprovalId: string,
  mpStatus: "pending" | "authorized" | "paused" | "cancelled",
): Promise<void> {
  const statusMap: Record<string, "pending" | "active" | "paused" | "cancelled"> = {
    pending: "pending",
    authorized: "active",
    paused: "paused",
    cancelled: "cancelled",
  };
  const newStatus = statusMap[mpStatus] ?? "pending";

  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(subscriptions)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(subscriptions.mpPreapprovalId, preapprovalId))
      .returning({
        profileId: subscriptions.profileId,
        plan: subscriptions.plan,
      });

    if (!updated) return;

    if (updated.plan === "provider_monthly") {
      await tx
        .update(providerProfiles)
        .set({ subscriptionActive: newStatus === "active" })
        .where(eq(providerProfiles.profileId, updated.profileId));
    }
  });
}
