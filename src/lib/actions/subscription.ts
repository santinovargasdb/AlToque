"use server";

import { revalidatePath } from "next/cache";
import {
  eq,
  and,
  or,
  lt,
  isNull,
  isNotNull,
  inArray,
  sql,
} from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions, providerProfiles } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import {
  createPreApproval,
  setPreApprovalStatus,
} from "@/lib/mercadopago/subscriptions";
import {
  FOUNDING_THRESHOLD,
  PROVIDER_REGULAR_PRICE,
  PROVIDER_FOUNDING_PRICE,
  CLIENT_PRICE,
  GRACE_DAYS,
} from "@/lib/subscriptions/plans";
import { countFoundingSlotsTaken } from "@/lib/subscriptions/status";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export type SubActionResult =
  | { ok: true; initPoint: string }
  | { ok: false; error: string };

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

  const n = await countFoundingSlotsTaken();
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

/** Suscripción `active` del usuario para el plan, con su preapproval de MP. */
async function findActiveSubscription(
  profileId: string,
  plan: "provider_monthly" | "client_monthly",
) {
  const [row] = await db
    .select({
      id: subscriptions.id,
      mpPreapprovalId: subscriptions.mpPreapprovalId,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.profileId, profileId),
        eq(subscriptions.plan, plan),
        eq(subscriptions.status, "active"),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function setCancelAtPeriodEnd(id: string, value: boolean): Promise<void> {
  await db
    .update(subscriptions)
    .set({ cancelAtPeriodEnd: value, updatedAt: new Date() })
    .where(eq(subscriptions.id, id));
}

/**
 * Baja al vencimiento: el acceso sigue hasta `current_period_end` y MP deja de
 * debitar. En MP se PAUSA (no se cancela) para que la reactivación siga siendo
 * posible; la cancelación definitiva la hace el cron al vencer el período.
 * El flag se marca ANTES de pausar: el webhook `paused` que dispara MP tiene
 * que encontrarlo para no cortar el acceso ya pagado.
 */
export async function cancelSubscriptionAtPeriodEnd(
  plan: "provider_monthly" | "client_monthly",
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sesión inválida." };

  const sub = await findActiveSubscription(session.user.id, plan);
  if (!sub) return { ok: false, error: "No tenés una suscripción activa." };

  await setCancelAtPeriodEnd(sub.id, true);
  if (sub.mpPreapprovalId) {
    try {
      await setPreApprovalStatus(sub.mpPreapprovalId, "paused");
    } catch {
      // Si MP no frenó los débitos, la baja no se registra: seguiría cobrando.
      await setCancelAtPeriodEnd(sub.id, false);
      return {
        ok: false,
        error: "No pudimos cancelar en Mercado Pago. Intentá nuevamente.",
      };
    }
  }

  revalidatePath(plan === "provider_monthly" ? "/pro/suscripcion" : "/suscripcion");
  return { ok: true };
}

/** Reactiva la renovación automática si estaba marcada para cancelar. */
export async function resumeSubscription(
  plan: "provider_monthly" | "client_monthly",
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sesión inválida." };

  const sub = await findActiveSubscription(session.user.id, plan);
  if (!sub) return { ok: false, error: "No tenés una suscripción activa." };

  if (sub.mpPreapprovalId) {
    try {
      await setPreApprovalStatus(sub.mpPreapprovalId, "authorized");
    } catch {
      return {
        ok: false,
        error: "No pudimos reactivar en Mercado Pago. Intentá nuevamente.",
      };
    }
  }
  await setCancelAtPeriodEnd(sub.id, false);

  revalidatePath(plan === "provider_monthly" ? "/pro/suscripcion" : "/suscripcion");
  return { ok: true };
}

/** ¿La suscripción habilita el acceso? Incluye la gracia (`past_due`). */
function isEntitled(status: string): boolean {
  return status === "active" || status === "past_due";
}

/**
 * Procesa un evento de preapproval del webhook de MP. Actualiza el estado de la
 * suscripción y sincroniza `subscription_active` (gate del matching). En la
 * primera activación arranca un período de 1 mes. Idempotente.
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
    // Baja con el período ya pagado: la pausa que hace cancelSubscriptionAtPeriodEnd,
    // o una cancelación hecha por el usuario desde la app de MP. El acceso sigue
    // hasta `current_period_end`; el cron cierra la suscripción al vencer.
    const [current] = await tx
      .select({
        status: subscriptions.status,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      })
      .from(subscriptions)
      .where(eq(subscriptions.mpPreapprovalId, preapprovalId))
      .limit(1);
    const endingPaidPeriod =
      current?.status === "active" &&
      current.currentPeriodEnd !== null &&
      current.currentPeriodEnd > new Date() &&
      (mpStatus === "cancelled" ||
        (mpStatus === "paused" && current.cancelAtPeriodEnd));
    if (endingPaidPeriod) {
      await tx
        .update(subscriptions)
        .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
        .where(eq(subscriptions.mpPreapprovalId, preapprovalId));
      return;
    }

    const [updated] = await tx
      .update(subscriptions)
      .set({
        status: newStatus,
        updatedAt: new Date(),
        // Primera activación: si todavía no hay período, arrancar uno de 1 mes.
        ...(newStatus === "active" && {
          currentPeriodEnd: sql`coalesce(${subscriptions.currentPeriodEnd}, now() + interval '1 month')`,
        }),
      })
      .where(eq(subscriptions.mpPreapprovalId, preapprovalId))
      .returning({
        profileId: subscriptions.profileId,
        plan: subscriptions.plan,
      });

    if (!updated) return;

    if (updated.plan === "provider_monthly") {
      await tx
        .update(providerProfiles)
        .set({ subscriptionActive: isEntitled(newStatus) })
        .where(eq(providerProfiles.profileId, updated.profileId));
    }
  });
}

/**
 * Un cobro recurrente (authorized payment) salió aprobado: renueva el período
 * (+1 mes desde el mayor entre el período vigente y ahora) y deja la
 * suscripción `active`. Lo dispara el webhook con topic
 * `subscription_authorized_payment`.
 *
 * Idempotente ante reentregas del webhook: solo renueva si el período está por
 * vencer o ya venció (`current_period_end < now + 3 días`, o null). Una segunda
 * notificación del mismo cobro encuentra el período ya lejos en el futuro y no
 * hace nada (evita sumar meses de más).
 */
export async function processAuthorizedPaymentApproved(
  preapprovalId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(subscriptions)
      .set({
        status: "active",
        currentPeriodEnd: sql`greatest(${subscriptions.currentPeriodEnd}, now()) + interval '1 month'`,
        // Un cobro aprobado = el usuario sigue pagando (p. ej. reactivó desde la
        // app de MP): una baja programada queda sin efecto.
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(subscriptions.mpPreapprovalId, preapprovalId),
          or(
            isNull(subscriptions.currentPeriodEnd),
            lt(subscriptions.currentPeriodEnd, sql`now() + interval '3 days'`),
          ),
        ),
      )
      .returning({
        profileId: subscriptions.profileId,
        plan: subscriptions.plan,
      });

    if (!updated) return;

    if (updated.plan === "provider_monthly") {
      await tx
        .update(providerProfiles)
        .set({ subscriptionActive: true })
        .where(eq(providerProfiles.profileId, updated.profileId));
    }
  });
}

/**
 * Cron de la gracia (spec §6). Todo se deriva de `current_period_end` (robusto
 * ante webhooks de rechazo perdidos):
 *  0. `active` con baja programada y el período vencido → `cancelled` (gate
 *     cerrado, sin gracia: no hubo cobro fallido) y cancelación definitiva en MP.
 *  1. `active` con el período vencido → `past_due` (el gate SIGUE abierto).
 *  2. `past_due` pasados los `GRACE_DAYS` → `cancelled` (gate cerrado).
 * Devuelve cuántas suscripciones movió en cada paso.
 */
export async function expireGracePeriods(): Promise<{
  ended: number;
  toPastDue: number;
  cancelled: number;
}> {
  // Paso 0: baja programada cumplida.
  const ended = await db.transaction(async (tx) => {
    const rows = await tx
      .update(subscriptions)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(
        and(
          eq(subscriptions.status, "active"),
          eq(subscriptions.cancelAtPeriodEnd, true),
          isNotNull(subscriptions.currentPeriodEnd),
          lt(subscriptions.currentPeriodEnd, sql`now()`),
        ),
      )
      .returning({
        profileId: subscriptions.profileId,
        plan: subscriptions.plan,
        mpPreapprovalId: subscriptions.mpPreapprovalId,
      });

    const providerIds = rows
      .filter((r) => r.plan === "provider_monthly")
      .map((r) => r.profileId);
    if (providerIds.length > 0) {
      await tx
        .update(providerProfiles)
        .set({ subscriptionActive: false })
        .where(inArray(providerProfiles.profileId, providerIds));
    }
    return rows;
  });

  // El preapproval ya estaba pausado (sin débitos); cancelarlo en MP es
  // limpieza, best-effort: un fallo no revierte la baja local.
  for (const row of ended) {
    if (!row.mpPreapprovalId) continue;
    try {
      await setPreApprovalStatus(row.mpPreapprovalId, "cancelled");
    } catch (error) {
      console.error("[subscriptions] no se pudo cancelar en MP", {
        preapprovalId: row.mpPreapprovalId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Paso 1: período vencido → past_due. `subscription_active` NO cambia (seguía
  // en true desde `active`; durante la gracia el acceso continúa).
  const toPastDue = await db
    .update(subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(
      and(
        eq(subscriptions.status, "active"),
        isNotNull(subscriptions.currentPeriodEnd),
        lt(subscriptions.currentPeriodEnd, sql`now()`),
      ),
    )
    .returning({ id: subscriptions.id });

  // Paso 2: gracia vencida → cancelled + cierra el gate del profesional.
  const cancelled = await db.transaction(async (tx) => {
    const rows = await tx
      .update(subscriptions)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(
        and(
          eq(subscriptions.status, "past_due"),
          isNotNull(subscriptions.currentPeriodEnd),
          lt(
            subscriptions.currentPeriodEnd,
            sql`now() - interval '${sql.raw(String(GRACE_DAYS))} days'`,
          ),
        ),
      )
      .returning({
        profileId: subscriptions.profileId,
        plan: subscriptions.plan,
      });

    const providerIds = rows
      .filter((r) => r.plan === "provider_monthly")
      .map((r) => r.profileId);
    if (providerIds.length > 0) {
      await tx
        .update(providerProfiles)
        .set({ subscriptionActive: false })
        .where(inArray(providerProfiles.profileId, providerIds));
    }
    return rows.length;
  });

  return { ended: ended.length, toPastDue: toPastDue.length, cancelled };
}
