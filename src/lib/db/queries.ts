import { sql, eq, and, asc, inArray } from "drizzle-orm";
import { db } from "./index";
import {
  profiles,
  providerProfiles,
  providerCategories,
  categories,
  reviews,
  messages,
  jobs,
} from "./schema";
import type { JobStatus, JobType, PaymentMethod, PaymentStatus } from "@/types";

/** Fila devuelta por find_nearby_providers (ver drizzle/postgis.sql). */
export type NearbyProvider = {
  provider_id: string;
  distance_km: number;
  rating_avg: string;
};

/**
 * "El profesional más cercano" para un oficio dado (PostGIS).
 * @param onlyOnline true para el flujo URGENTE (exige is_online = true).
 *
 * Llama a la función SQL `find_nearby_providers` /
 * `find_nearby_online_providers` definidas en drizzle/postgis.sql.
 */
export async function findNearbyProviders(params: {
  categoryId: string;
  lat: number;
  lng: number;
  limit?: number;
  onlyOnline?: boolean;
}): Promise<NearbyProvider[]> {
  const { categoryId, lat, lng, limit = 20, onlyOnline = false } = params;
  const fn = onlyOnline
    ? sql`find_nearby_online_providers`
    : sql`find_nearby_providers`;

  const rows = (await db.execute(
    sql`select * from ${fn}(${categoryId}::uuid, ${lng}::float8, ${lat}::float8, ${limit}::int)`,
  )) as unknown as NearbyProvider[];
  return rows;
}

export type ProviderSearchResult = {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  jobsCompleted: number;
  ratingAvg: number;
  reviewCount: number;
  distanceKm: number;
  lat: number;
  lng: number;
  categories: string[];
};

/**
 * Búsqueda geo enriquecida: combina find_nearby_providers (cercanía) con
 * los detalles de cada profesional (nombre, rating, oficios, ubicación).
 * Mantiene el orden por distancia ascendente.
 */
export async function searchProviders(params: {
  categoryId: string;
  lat: number;
  lng: number;
  limit?: number;
}): Promise<ProviderSearchResult[]> {
  const nearby = await findNearbyProviders({ ...params, onlyOnline: false });
  if (nearby.length === 0) return [];

  const ids = nearby.map((n) => n.provider_id);
  const distance = new Map(ids.map((id, i) => [id, nearby[i]!.distance_km]));

  const [details, cats, counts] = await Promise.all([
    db
      .select({
        id: providerProfiles.profileId,
        fullName: profiles.fullName,
        avatarUrl: profiles.avatarUrl,
        bio: providerProfiles.bio,
        jobsCompleted: providerProfiles.jobsCompleted,
        ratingAvg: providerProfiles.ratingAvg,
        lat: sql<number>`st_y(${providerProfiles.baseLocation}::geometry)`,
        lng: sql<number>`st_x(${providerProfiles.baseLocation}::geometry)`,
      })
      .from(providerProfiles)
      .innerJoin(profiles, eq(profiles.id, providerProfiles.profileId))
      .where(inArray(providerProfiles.profileId, ids)),
    db
      .select({
        providerId: providerCategories.providerId,
        name: categories.name,
      })
      .from(providerCategories)
      .innerJoin(categories, eq(categories.id, providerCategories.categoryId))
      .where(inArray(providerCategories.providerId, ids)),
    db
      .select({
        targetId: reviews.targetId,
        count: sql<number>`count(*)::int`,
      })
      .from(reviews)
      .where(inArray(reviews.targetId, ids))
      .groupBy(reviews.targetId),
  ]);

  const detailMap = new Map(details.map((d) => [d.id, d]));
  const catMap = new Map<string, string[]>();
  for (const c of cats) {
    const arr = catMap.get(c.providerId) ?? [];
    arr.push(c.name);
    catMap.set(c.providerId, arr);
  }
  const countMap = new Map(counts.map((c) => [c.targetId, Number(c.count)]));

  return ids
    .map((id) => {
      const d = detailMap.get(id);
      if (!d) return null;
      return {
        id,
        fullName: d.fullName,
        avatarUrl: d.avatarUrl,
        bio: d.bio,
        jobsCompleted: d.jobsCompleted,
        ratingAvg: Number(d.ratingAvg),
        reviewCount: countMap.get(id) ?? 0,
        distanceKm: distance.get(id) ?? 0,
        lat: Number(d.lat),
        lng: Number(d.lng),
        categories: catMap.get(id) ?? [],
      } satisfies ProviderSearchResult;
    })
    .filter((x): x is ProviderSearchResult => x !== null);
}

export type JobDetail = {
  id: string;
  status: JobStatus;
  type: JobType;
  title: string;
  description: string | null;
  photos: string[] | null;
  addressText: string | null;
  lat: number | null;
  lng: number | null;
  scheduledAt: Date | null;
  paymentMethod: PaymentMethod;
  priceEstimate: string | null;
  mpPreferenceId: string | null;
  finalPrice: string | null;
  commissionAmount: string | null;
  paymentStatus: PaymentStatus;
  cancelReason: string | null;
  createdAt: Date;
  acceptedAt: Date | null;
  completedAt: Date | null;
  categoryName: string;
  clientId: string;
  clientName: string | null;
  providerId: string | null;
  providerName: string | null;
  providerAvatar: string | null;
  providerRating: number | null;
};

/** Detalle enriquecido de un pedido para las vistas de cliente y profesional. */
export async function getJobDetail(jobId: string): Promise<JobDetail | null> {
  const [job] = await db
    .select({
      id: jobs.id,
      status: jobs.status,
      type: jobs.type,
      title: jobs.title,
      description: jobs.description,
      photos: jobs.photos,
      addressText: jobs.addressText,
      lat: sql<number | null>`st_y(${jobs.location}::geometry)`,
      lng: sql<number | null>`st_x(${jobs.location}::geometry)`,
      scheduledAt: jobs.scheduledAt,
      paymentMethod: jobs.paymentMethod,
      priceEstimate: jobs.priceEstimate,
      mpPreferenceId: jobs.mpPreferenceId,
      finalPrice: jobs.finalPrice,
      commissionAmount: jobs.commissionAmount,
      paymentStatus: jobs.paymentStatus,
      cancelReason: jobs.cancelReason,
      createdAt: jobs.createdAt,
      acceptedAt: jobs.acceptedAt,
      completedAt: jobs.completedAt,
      categoryName: categories.name,
      clientId: jobs.clientId,
      providerId: jobs.providerId,
    })
    .from(jobs)
    .innerJoin(categories, eq(categories.id, jobs.categoryId))
    .where(eq(jobs.id, jobId))
    .limit(1);

  if (!job) return null;

  const ids = [job.clientId, job.providerId].filter(
    (x): x is string => !!x,
  );
  const people = ids.length
    ? await db
        .select({
          id: profiles.id,
          name: profiles.fullName,
          avatar: profiles.avatarUrl,
        })
        .from(profiles)
        .where(inArray(profiles.id, ids))
    : [];
  const pmap = new Map(people.map((p) => [p.id, p]));

  let providerRating: number | null = null;
  if (job.providerId) {
    const [pp] = await db
      .select({ r: providerProfiles.ratingAvg })
      .from(providerProfiles)
      .where(eq(providerProfiles.profileId, job.providerId))
      .limit(1);
    providerRating = pp ? Number(pp.r) : null;
  }

  const provider = job.providerId ? pmap.get(job.providerId) : undefined;

  return {
    ...job,
    lat: job.lat != null ? Number(job.lat) : null,
    lng: job.lng != null ? Number(job.lng) : null,
    clientName: pmap.get(job.clientId)?.name ?? null,
    providerName: provider?.name ?? null,
    providerAvatar: provider?.avatar ?? null,
    providerRating,
  };
}

/** Reseña que dejó `authorId` sobre un trabajo (o null si aún no reseñó). */
export async function getJobReviewByAuthor(jobId: string, authorId: string) {
  const [review] = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
    })
    .from(reviews)
    .where(and(eq(reviews.jobId, jobId), eq(reviews.authorId, authorId)))
    .limit(1);
  return review ?? null;
}

/** Mensajes del chat de un trabajo, serializados para el client component. */
export async function getJobMessages(jobId: string) {
  const rows = await db
    .select({
      id: messages.id,
      senderId: messages.senderId,
      body: messages.body,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.jobId, jobId))
    .orderBy(asc(messages.createdAt))
    .limit(200);
  return rows.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }));
}
