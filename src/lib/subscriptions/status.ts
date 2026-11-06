import "server-only";
import { and, count, eq, gt, inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions, providerProfiles } from "@/lib/db/schema";
import {
  FOUNDING_PENDING_HOLD_HOURS,
  FREE_JOBS,
  GRACE_DAYS,
} from "@/lib/subscriptions/plans";

/**
 * ¿El cliente tiene una suscripción Premium (`client_monthly`) habilitada?
 * Gate de las funciones exclusivas de Premium (hoy: pedidos urgentes).
 * `active` y `past_due` habilitan (durante la gracia el acceso sigue abierto,
 * spec §6); `pending` aún no autorizó el pago en MP.
 */
export async function hasActiveClientSubscription(
  profileId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.profileId, profileId),
        eq(subscriptions.plan, "client_monthly"),
        inArray(subscriptions.status, ["active", "past_due"]),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/**
 * ¿El profesional puede recibir y aceptar pedidos nuevos? Tiene que estar
 * `approved` y además habilitado por una de estas dos vías:
 *  - tiene suscripción activa (`subscription_active`, incluye la gracia
 *    `past_due`, lo mantiene el webhook de MP), O
 *  - todavía está en el trial de bienvenida (`jobs_completed < FREE_JOBS`).
 * Es la MISMA regla que el gate PostGIS del matching
 * (`find_nearby_providers` / `find_nearby_online_providers`).
 */
export async function providerCanReceiveJobs(
  profileId: string,
): Promise<boolean> {
  const [row] = await db
    .select({
      active: providerProfiles.subscriptionActive,
      jobsCompleted: providerProfiles.jobsCompleted,
      verificationStatus: providerProfiles.verificationStatus,
    })
    .from(providerProfiles)
    .where(eq(providerProfiles.profileId, profileId))
    .limit(1);
  if (!row || row.verificationStatus !== "approved") return false;
  return row.active || row.jobsCompleted < FREE_JOBS;
}

export type ProviderGateState =
  | { kind: "active" }
  | { kind: "trial"; freeJobsLeft: number }
  | { kind: "grace"; until: Date | null }
  | { kind: "blocked" };

/**
 * Estado de habilitación del profesional, para el aviso visible en la app
 * (spec §6). Prioridad: suscripción (active/past_due) por encima del trial.
 *  - `active`: plan al día → sin aviso.
 *  - `trial`: sin plan pero dentro de los `FREE_JOBS` gratis.
 *  - `grace`: cobro fallido, en gracia (`past_due`) hasta `until`.
 *  - `blocked`: sin plan y con el trial agotado → no recibe pedidos.
 */
export async function getProviderGateState(
  profileId: string,
): Promise<ProviderGateState> {
  const [pp] = await db
    .select({ jobsCompleted: providerProfiles.jobsCompleted })
    .from(providerProfiles)
    .where(eq(providerProfiles.profileId, profileId))
    .limit(1);
  const jobsCompleted = pp?.jobsCompleted ?? 0;

  const [sub] = await db
    .select({
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.profileId, profileId),
        eq(subscriptions.plan, "provider_monthly"),
      ),
    )
    .limit(1);

  if (sub?.status === "active") return { kind: "active" };
  if (sub?.status === "past_due") {
    const until = sub.currentPeriodEnd
      ? new Date(sub.currentPeriodEnd.getTime() + GRACE_DAYS * 86_400_000)
      : null;
    return { kind: "grace", until };
  }
  if (jobsCompleted < FREE_JOBS) {
    return { kind: "trial", freeJobsLeft: FREE_JOBS - jobsCompleted };
  }
  return { kind: "blocked" };
}

/**
 * ¿Este preapproval de MP es de una suscripción nuestra? El webhook lo usa para
 * ignorar eventos ajenos (la simulación del panel de MP, otra app de la misma
 * cuenta) sin consultar a MP ni responder 500.
 */
export async function isKnownPreapproval(preapprovalId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.mpPreapprovalId, preapprovalId))
    .limit(1);
  return Boolean(row);
}

/**
 * Cupos de precio fundador ocupados: suscripciones profesionales que llegaron a
 * autorizar el pago en MP (`active`, `past_due` o `paused`), más las `pending`
 * recientes: ya tienen el precio fundador fijado en MP y pueden autorizarlo en
 * cualquier momento. Una `pending` abandonada libera el cupo pasado
 * `FOUNDING_PENDING_HOLD_HOURS`; una `cancelled` lo libera enseguida.
 */
export async function countFoundingSlotsTaken(): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.plan, "provider_monthly"),
        or(
          inArray(subscriptions.status, ["active", "past_due", "paused"]),
          and(
            eq(subscriptions.status, "pending"),
            gt(
              subscriptions.updatedAt,
              sql`now() - make_interval(hours => ${FOUNDING_PENDING_HOLD_HOURS}::int)`,
            ),
          ),
        ),
      ),
    );
  return Number(row?.n ?? 0);
}
