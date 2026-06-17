"use server";

import { revalidatePath } from "next/cache";
import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs, jobDispatch } from "@/lib/db/schema";
import { findNearbyProviders } from "@/lib/db/queries";
import { dispatchNewUrgentJob } from "@/lib/notifications/dispatch";
import { getSession } from "@/lib/auth";
import { geocodeAddress } from "@/lib/maps/geocode";
import { createJobSchema, setFinalPriceSchema } from "@/lib/validations/job";
import {
  DEFAULT_COMMISSION_RATE,
  calculateCommission,
} from "@/lib/mercadopago/commission";
import { createJobPreference } from "@/lib/mercadopago/preference";
import type { ActionResult } from "./provider";

const URGENT_BROADCAST_LIMIT = 10;

export type CreateJobResult =
  | { ok: true; jobId: string; redirectUrl?: string }
  | { ok: false; error: string };

/**
 * Crea un pedido (agendado o urgente). Pago:
 *  - cash → no toca MP (paymentStatus 'none').
 *  - transfer/card → crea preferencia de Checkout Pro (escrow a la cuenta de
 *    AlToque), deja paymentStatus 'pending' y devuelve `redirectUrl` (init_point)
 *    para que el cliente pague. El webhook lo pasa a 'held'.
 */
export async function createJob(input: unknown): Promise<CreateJobResult> {
  const session = await getSession();
  if (!session || session.role !== "client") {
    return { ok: false, error: "Solo los clientes pueden crear pedidos." };
  }

  const parsed = createJobSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  const data = parsed.data;

  let { lat, lng } = data;
  if (lat == null || lng == null) {
    const geo = await geocodeAddress(data.addressText);
    if (!geo) {
      return { ok: false, error: "No pudimos ubicar la dirección del trabajo." };
    }
    lat = geo.lat;
    lng = geo.lng;
  }

  const commissionRate = DEFAULT_COMMISSION_RATE.toFixed(3);
  const isPrepaid = data.paymentMethod !== "cash";
  const initialPaymentStatus = isPrepaid ? "pending" : "none";
  const isBroadcast = data.type === "urgent" && !data.providerId;

  let jobId: string;

  if (isBroadcast) {
    // ── Flujo URGENTE sin proveedor: broadcast a los online cercanos ──
    const nearby = await findNearbyProviders({
      categoryId: data.categoryId,
      lat,
      lng,
      limit: URGENT_BROADCAST_LIMIT,
      onlyOnline: true,
    });
    if (nearby.length === 0) {
      return {
        ok: false,
        error:
          "No hay profesionales disponibles ahora mismo cerca tuyo. Probá agendar el trabajo.",
      };
    }

    jobId = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(jobs)
        .values({
          clientId: session.user.id,
          categoryId: data.categoryId,
          type: "urgent",
          status: "broadcasting",
          title: data.title,
          description: data.description,
          photos: data.photos,
          addressText: data.addressText,
          paymentMethod: data.paymentMethod,
          priceEstimate: data.priceEstimate?.toFixed(2),
          paymentStatus: initialPaymentStatus,
          commissionRate,
        })
        .returning({ id: jobs.id });
      const id = row!.id;
      await tx.execute(
        sql`update jobs set location = st_setsrid(st_makepoint(${lng}, ${lat}), 4326) where id = ${id}`,
      );
      await tx.insert(jobDispatch).values(
        nearby.map((n) => ({
          jobId: id,
          providerId: n.provider_id,
          status: "notified" as const,
          distanceKm: String(n.distance_km),
        })),
      );
      return id;
    });

    // Broadcast inmediato (el pago va en paralelo).
    await dispatchNewUrgentJob({
      jobId,
      title: data.title,
      providerIds: nearby.map((n) => n.provider_id),
    });
  } else {
    // ── Flujo agendado / directo a un proveedor ──
    jobId = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(jobs)
        .values({
          clientId: session.user.id,
          providerId: data.providerId ?? null,
          categoryId: data.categoryId,
          type: data.type,
          status: "requested",
          title: data.title,
          description: data.description,
          photos: data.photos,
          addressText: data.addressText,
          scheduledAt: data.scheduledAt,
          paymentMethod: data.paymentMethod,
          priceEstimate: data.priceEstimate?.toFixed(2),
          paymentStatus: initialPaymentStatus,
          commissionRate,
        })
        .returning({ id: jobs.id });
      const id = row!.id;
      await tx.execute(
        sql`update jobs set location = st_setsrid(st_makepoint(${lng}, ${lat}), 4326) where id = ${id}`,
      );
      return id;
    });
  }

  // ── Cola de pago (transfer/card): preferencia de Checkout Pro ──
  if (isPrepaid) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    try {
      const { preferenceId, initPoint } = await createJobPreference({
        jobId,
        title: data.title,
        amount: data.priceEstimate!,
        appUrl,
      });
      await db
        .update(jobs)
        .set({ mpPreferenceId: preferenceId })
        .where(eq(jobs.id, jobId));
      revalidatePath("/pedidos");
      revalidatePath("/pro/pedidos");
      return { ok: true, jobId, redirectUrl: initPoint };
    } catch {
      await db
        .update(jobs)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(jobs.id, jobId));
      return {
        ok: false,
        error: "No pudimos iniciar el pago. Probá de nuevo.",
      };
    }
  }

  revalidatePath("/pedidos");
  revalidatePath("/pro/pedidos");
  return { ok: true, jobId };
}

type StatusTarget = "accepted" | "in_progress" | "cancelled";

/** Transiciones de estado del pedido (aceptar / iniciar / cancelar). */
export async function updateJobStatus(params: {
  jobId: string;
  status: StatusTarget;
  reason?: string;
}): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "No autorizado." };
  const uid = session.user.id;

  const [job] = await db
    .select({
      clientId: jobs.clientId,
      providerId: jobs.providerId,
      status: jobs.status,
    })
    .from(jobs)
    .where(eq(jobs.id, params.jobId))
    .limit(1);
  if (!job) return { ok: false, error: "Pedido no encontrado." };

  const isProvider = uid === job.providerId;
  const isClient = uid === job.clientId;
  if (!isProvider && !isClient) {
    return { ok: false, error: "No autorizado." };
  }

  const now = new Date();

  if (params.status === "accepted") {
    if (!isProvider || job.status !== "requested") {
      return { ok: false, error: "No se puede aceptar este pedido." };
    }
    await db
      .update(jobs)
      .set({ status: "accepted", acceptedAt: now, updatedAt: now })
      .where(eq(jobs.id, params.jobId));
  } else if (params.status === "in_progress") {
    if (!isProvider || job.status !== "accepted") {
      return { ok: false, error: "El pedido debe estar aceptado." };
    }
    await db
      .update(jobs)
      .set({ status: "in_progress", updatedAt: now })
      .where(eq(jobs.id, params.jobId));
  } else if (params.status === "cancelled") {
    if (!["requested", "accepted", "in_progress"].includes(job.status)) {
      return { ok: false, error: "El pedido ya no se puede cancelar." };
    }
    await db
      .update(jobs)
      .set({
        status: "cancelled",
        cancelReason: params.reason ?? null,
        updatedAt: now,
      })
      .where(eq(jobs.id, params.jobId));
  }

  revalidatePath(`/pedido/${params.jobId}`);
  revalidatePath(`/pro/pedido/${params.jobId}`);
  revalidatePath("/pro/pedidos");
  return { ok: true };
}

/**
 * El profesional carga el precio final → calcula la comisión (única fuente
 * de verdad) y marca el pedido como completado.
 */
export async function completeJob(input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return { ok: false, error: "No autorizado." };
  }

  const parsed = setFinalPriceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Precio inválido.",
    };
  }
  const { jobId, finalPrice } = parsed.data;

  const [job] = await db
    .select({
      providerId: jobs.providerId,
      status: jobs.status,
      commissionRate: jobs.commissionRate,
    })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);
  if (!job) return { ok: false, error: "Pedido no encontrado." };
  if (job.providerId !== session.user.id) {
    return { ok: false, error: "No autorizado." };
  }
  if (job.status !== "in_progress") {
    return { ok: false, error: "El pedido debe estar en curso." };
  }

  const { commissionAmount } = calculateCommission(
    finalPrice,
    Number(job.commissionRate),
  );
  const now = new Date();

  await db
    .update(jobs)
    .set({
      finalPrice: finalPrice.toFixed(2),
      commissionAmount: commissionAmount.toFixed(2),
      status: "completed",
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(jobs.id, jobId));

  // Nota: el registro en commission_ledger (split / cash_debt) se agrega en
  // el Step 9 (pagos).
  revalidatePath(`/pedido/${jobId}`);
  revalidatePath(`/pro/pedido/${jobId}`);
  revalidatePath("/pro/pedidos");
  revalidatePath("/pro/inicio");
  return { ok: true };
}
