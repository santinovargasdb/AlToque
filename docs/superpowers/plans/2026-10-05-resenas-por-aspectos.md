# Reseñas por aspectos (KPIs de reputación) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada reseña puntúe 4 aspectos concretos (1–5) por dirección y que la estrella general sea el promedio de esos aspectos, con desglose visible en los dos sentidos (cliente↔profesional).

**Architecture:** Los puntajes van en una tabla normalizada `review_aspects` (fila por aspecto). `reviews.rating` pasa a `numeric(2,1)` y guarda la nota general (= promedio de los 4 aspectos de esa reseña). Los promedios agregados se cachean para listados (`provider_profiles.ratingAvg` el pro, `profiles.ratingAvg/ratingCount` el cliente) y el desglose por aspecto se calcula on-demand con `GROUP BY`. Los aspectos viven en una fuente central tipada reusada por UI, validación y agregación.

**Tech Stack:** Next.js 15 (App Router, Server Actions), TypeScript strict, Drizzle + Postgres (Supabase), Zod, Tailwind v4 + shadcn/ui, motion, Vitest.

## Global Constraints

- TypeScript strict. Prohibido `any`; usar tipos inferidos de Drizzle/Zod. (CLAUDE.md)
- Toda mutación es Server Action validada con Zod; re-validar SIEMPRE server-side. (CLAUDE.md)
- RLS habilitado en todas las tablas; las policies se escriben a mano (Drizzle server-side bypassa RLS por el pooler owner). (CLAUDE.md)
- Migraciones: `pnpm db:generate` → `pnpm db:migrate` por el **Session pooler**; **`db:push` PROHIBIDO** contra prod. (CLAUDE.md)
- Un componente por archivo, máx 300 líneas; alias `@/` para `src/`; sin barrel exports. (CLAUDE.md)
- Mobile-first: cada vista funciona en 360px. (CLAUDE.md)
- Español rioplatense en todo el texto de UI.
- Aspectos del pro: Puntualidad · Calidad del trabajo · Trato y comunicación · Precio justo. Aspectos del cliente: Trato y respeto · Puntualidad / disponibilidad · Claridad del pedido · Pago acordado. (spec)
- Los 4 aspectos son obligatorios (1–5); comentario opcional; sin preview de nota general en vivo. (spec)

---

## File structure

**Nuevos:**
- `src/lib/reviews/aspects.ts` — fuente central de aspectos + helper de promedio.
- `src/components/pro/client-reputation.tsx` — reputación del cliente con desplegable (client component).
- `src/components/shared/aspect-breakdown.tsx` — lista de promedios por aspecto (reusada en perfil del pro y en el desplegable del cliente).
- `tests/reviews.test.ts` — unit de validación + cálculo.

**Modificados:**
- `src/lib/db/schema.ts` — enum `review_aspect`, tabla `review_aspects`, `reviews.rating`→numeric, `profiles.ratingAvg/ratingCount`.
- `src/lib/validations/job.ts` — `reviewSchema` con `aspects`.
- `src/lib/actions/review.ts` — `submitReview` con aspectos + recálculo bidireccional.
- `src/lib/db/queries.ts` — `getAspectAverages`, `getClientReputation`, aspectos en `getJobReviewByAuthor`.
- `src/components/shared/review-form.tsx` — 4 filas por dirección.
- `src/components/shared/review-summary.tsx` — muestra el desglose.
- `src/app/(app)/pedido/[id]/page.tsx` y `src/app/(pro)/pro/pedido/[id]/page.tsx` — pasan la dirección al form; el del pro monta la reputación del cliente.
- `src/app/(app)/profesional/[id]/page.tsx` — desglose por aspecto.
- `drizzle/postgis.sql` — RLS de `review_aspects` (o SQL doc análogo de policies).

**Nota sobre tests de UI:** el proyecto no testea componentes React (solo validación/lógica/integración). Las tareas de UI terminan en `typecheck`+`lint`+verificación manual, no en test unitario de componente — es el patrón del repo, no un atajo.

---

## Task 1: Fuente central de aspectos

**Files:**
- Create: `src/lib/reviews/aspects.ts`
- Test: `tests/reviews.test.ts`

**Interfaces:**
- Produces: `PROVIDER_ASPECTS`, `CLIENT_ASPECTS` (`readonly {key,label}[]`), `ALL_ASPECT_KEYS` (tuple de 8 strings), `AspectKey` (union), `ReviewDirection = "client_to_provider" | "provider_to_client"`, `aspectsFor(direction): readonly AspectDef[]`, `aspectKeysFor(direction): AspectKey[]`, `generalFromAspects(scores: number[]): number`, `aspectLabel(key): string`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/reviews.test.ts
import { describe, it, expect } from "vitest";
import {
  PROVIDER_ASPECTS,
  CLIENT_ASPECTS,
  ALL_ASPECT_KEYS,
  aspectKeysFor,
  generalFromAspects,
  aspectLabel,
} from "@/lib/reviews/aspects";

describe("aspects · fuente central", () => {
  it("tiene 4 aspectos por dirección y 8 claves únicas en total", () => {
    expect(PROVIDER_ASPECTS).toHaveLength(4);
    expect(CLIENT_ASPECTS).toHaveLength(4);
    expect(new Set(ALL_ASPECT_KEYS).size).toBe(8);
  });

  it("aspectKeysFor devuelve las claves de la dirección", () => {
    expect(aspectKeysFor("client_to_provider")).toEqual([
      "punctuality",
      "quality",
      "communication",
      "price",
    ]);
    expect(aspectKeysFor("provider_to_client")).toEqual([
      "respect",
      "availability",
      "clarity",
      "payment",
    ]);
  });

  it("aspectLabel resuelve la etiqueta de una clave", () => {
    expect(aspectLabel("quality")).toBe("Calidad del trabajo");
  });
});

describe("generalFromAspects · promedio a 1 decimal", () => {
  it("promedia y redondea a 1 decimal", () => {
    expect(generalFromAspects([5, 4, 4, 4])).toBe(4.3); // 17/4 = 4.25 → 4.3
    expect(generalFromAspects([5, 5, 5, 5])).toBe(5);
    expect(generalFromAspects([3, 4, 2, 5])).toBe(3.5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test reviews`
Expected: FAIL — `Cannot find module '@/lib/reviews/aspects'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/reviews/aspects.ts
/**
 * Fuente central de los aspectos de reseña (KPIs). Única verdad para UI,
 * validación (Zod) y agregación. Los aspectos difieren según quién reseña:
 * el cliente puntúa al profesional y el profesional al cliente.
 */

export type AspectDef = { readonly key: string; readonly label: string };

/** Aspectos que el CLIENTE puntúa del PROFESIONAL. */
export const PROVIDER_ASPECTS = [
  { key: "punctuality", label: "Puntualidad" },
  { key: "quality", label: "Calidad del trabajo" },
  { key: "communication", label: "Trato y comunicación" },
  { key: "price", label: "Precio justo" },
] as const satisfies readonly AspectDef[];

/** Aspectos que el PROFESIONAL puntúa del CLIENTE. */
export const CLIENT_ASPECTS = [
  { key: "respect", label: "Trato y respeto" },
  { key: "availability", label: "Puntualidad / disponibilidad" },
  { key: "clarity", label: "Claridad del pedido" },
  { key: "payment", label: "Pago acordado" },
] as const satisfies readonly AspectDef[];

/** Las 8 claves posibles (para el enum de DB y la validación Zod). */
export const ALL_ASPECT_KEYS = [
  "punctuality",
  "quality",
  "communication",
  "price",
  "respect",
  "availability",
  "clarity",
  "payment",
] as const;

export type AspectKey = (typeof ALL_ASPECT_KEYS)[number];

/** Dirección de la reseña: quién puntúa a quién. */
export type ReviewDirection = "client_to_provider" | "provider_to_client";

/** Set de aspectos (con label) de una dirección. */
export function aspectsFor(direction: ReviewDirection): readonly AspectDef[] {
  return direction === "client_to_provider" ? PROVIDER_ASPECTS : CLIENT_ASPECTS;
}

/** Solo las claves de una dirección (orden estable). */
export function aspectKeysFor(direction: ReviewDirection): AspectKey[] {
  return aspectsFor(direction).map((a) => a.key as AspectKey);
}

const LABELS: Record<string, string> = Object.fromEntries(
  [...PROVIDER_ASPECTS, ...CLIENT_ASPECTS].map((a) => [a.key, a.label]),
);

/** Etiqueta legible de una clave de aspecto. */
export function aspectLabel(key: string): string {
  return LABELS[key] ?? key;
}

/** Nota general = promedio de los puntajes, redondeado a 1 decimal. */
export function generalFromAspects(scores: number[]): number {
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg * 10) / 10;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test reviews`
Expected: PASS (6 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/lib/reviews/aspects.ts tests/reviews.test.ts
git commit -m "feat(reviews): fuente central de aspectos + promedio"
```

---

## Task 2: Schema + migración + RLS

**Files:**
- Modify: `src/lib/db/schema.ts` (reviews ~201-225; profiles ~67-79; relations ~385-391)
- Modify: `drizzle/postgis.sql` (agregar policies de `review_aspects` al final del bloque de RLS)

**Interfaces:**
- Consumes: `ALL_ASPECT_KEYS` (Task 1).
- Produces: tabla Drizzle `reviewAspects` (`id`, `reviewId`, `aspect`, `score`); `reviews.rating` como `numeric(2,1)`; `profiles.ratingAvg` (`numeric(2,1)`), `profiles.ratingCount` (`integer`).

- [ ] **Step 1: Agregar el enum y la tabla a `schema.ts`**

Importar las claves arriba del archivo (bajo los imports existentes):

```ts
import { ALL_ASPECT_KEYS } from "@/lib/reviews/aspects";
```

Agregar el enum junto a los demás (después de `dispatchStatusEnum`, ~línea 64):

```ts
export const reviewAspectEnum = pgEnum("review_aspect", ALL_ASPECT_KEYS);
```

En `profiles` (dentro del objeto, después de `avatarUrl`, ~línea 72) agregar la reputación del cliente:

```ts
  ratingAvg: numeric("rating_avg", { precision: 2, scale: 1 })
    .notNull()
    .default("0.0"),
  ratingCount: integer("rating_count").notNull().default(0),
```

Cambiar `reviews.rating` de `integer` a `numeric` (línea 215):

```ts
    rating: numeric("rating", { precision: 2, scale: 1 }).notNull(), // nota general = promedio de aspectos (1–5)
```

Agregar la tabla nueva justo después del cierre de `reviews` (~línea 225):

```ts
// ── review_aspects (puntaje por aspecto de cada reseña) ──
export const reviewAspects = pgTable(
  "review_aspects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    aspect: reviewAspectEnum("aspect").notNull(),
    score: integer("score").notNull(), // 1–5 (check en postgis.sql)
  },
  (t) => [
    unique("uq_review_aspect").on(t.reviewId, t.aspect),
    index("idx_review_aspects_review").on(t.reviewId),
  ],
);
```

- [ ] **Step 2: Verificar que compila**

Run: `pnpm typecheck`
Expected: PASS (sin errores). Si `pgEnum` se queja del tipo de `ALL_ASPECT_KEYS`, castear: `pgEnum("review_aspect", ALL_ASPECT_KEYS as unknown as [string, ...string[]])`.

- [ ] **Step 3: Generar la migración**

Run: `pnpm db:generate`
Expected: crea un archivo nuevo en `drizzle/` con: `CREATE TYPE "review_aspect"`, `CREATE TABLE "review_aspects"`, `ALTER TABLE "profiles" ADD COLUMN "rating_avg"/"rating_count"`, y el `ALTER ... ALTER COLUMN "rating" ... numeric`. Abrir el SQL y confirmar que el cambio de `rating` es un cast a numeric (los valores 1–5 existentes caben).

- [ ] **Step 4: Agregar los CHECK y las RLS a `drizzle/postgis.sql`**

Agregar al final (junto a las demás policies):

```sql
-- review_aspects: puntaje 1–5 y RLS (lectura pública, escritura del autor de la reseña)
alter table review_aspects add constraint review_aspects_score_chk check (score between 1 and 5);
alter table review_aspects enable row level security;
create policy "review_aspects_read" on review_aspects
  for select using (true);
create policy "review_aspects_insert" on review_aspects
  for insert with check (
    exists (select 1 from reviews r where r.id = review_id and r.author_id = auth.uid())
  );

-- reviews.rating pasa a soportar 1 decimal
alter table reviews drop constraint if exists reviews_rating_chk;
alter table reviews add constraint reviews_rating_chk check (rating between 1.0 and 5.0);
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema.ts drizzle/ 
git commit -m "feat(reviews): schema review_aspects + reputación del cliente + RLS"
```

> La aplicación real contra prod (`pnpm db:migrate` por el Session pooler + correr el bloque nuevo de `postgis.sql`) sigue el runbook de `CLAUDE.md` y se hace en el deploy, no en esta tarea.

---

## Task 3: Validación Zod del `reviewSchema`

**Files:**
- Modify: `src/lib/validations/job.ts:47-53`
- Test: `tests/reviews.test.ts` (agregar bloque)

**Interfaces:**
- Consumes: `ALL_ASPECT_KEYS` (Task 1).
- Produces: `reviewSchema` con forma `{ jobId, targetId, aspects: Record<AspectKey, 1..5>, comment? }` y exactamente 4 aspectos.

- [ ] **Step 1: Write the failing test**

```ts
// tests/reviews.test.ts (append)
import { reviewSchema } from "@/lib/validations/job";

const baseReview = {
  jobId: "11111111-1111-1111-1111-111111111111",
  targetId: "22222222-2222-2222-2222-222222222222",
  aspects: { punctuality: 5, quality: 4, communication: 5, price: 4 },
  comment: "Impecable",
};

describe("reviewSchema · aspectos", () => {
  it("acepta 4 aspectos válidos", () => {
    expect(reviewSchema.safeParse(baseReview).success).toBe(true);
  });

  it("rechaza si faltan aspectos (menos de 4)", () => {
    const r = reviewSchema.safeParse({
      ...baseReview,
      aspects: { punctuality: 5, quality: 4 },
    });
    expect(r.success).toBe(false);
  });

  it("rechaza un score fuera de 1–5", () => {
    const r = reviewSchema.safeParse({
      ...baseReview,
      aspects: { ...baseReview.aspects, quality: 6 },
    });
    expect(r.success).toBe(false);
  });

  it("rechaza una clave de aspecto desconocida", () => {
    const r = reviewSchema.safeParse({
      ...baseReview,
      aspects: { punctuality: 5, quality: 4, communication: 5, bogus: 4 },
    });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test reviews`
Expected: FAIL — el `reviewSchema` actual no tiene `aspects` (los tests nuevos fallan por forma).

- [ ] **Step 3: Reescribir `reviewSchema`**

Reemplazar el bloque `export const reviewSchema = z.object({...})` (líneas 47-53) por:

```ts
import { ALL_ASPECT_KEYS } from "@/lib/reviews/aspects";

/** Puntaje individual de un aspecto. */
const aspectScore = z.number().int().min(1).max(5);

/** Input de `submitReview`. Los 4 aspectos van en `aspects`; la nota general
 * la calcula la Server Action como promedio. El set correcto de claves según
 * la dirección (cliente→pro vs pro→cliente) se valida en `submitReview`. */
export const reviewSchema = z
  .object({
    jobId: z.string().uuid(),
    targetId: z.string().uuid(),
    aspects: z.record(z.enum(ALL_ASPECT_KEYS), aspectScore),
    comment: z.string().max(1000).optional(),
  })
  .refine((d) => Object.keys(d.aspects).length === 4, {
    message: "Calificá los 4 aspectos.",
    path: ["aspects"],
  });
```

(El `import` va arriba con los demás imports del archivo.) Si `z.enum(ALL_ASPECT_KEYS)` se queja por el array `readonly`, castear: `z.enum(ALL_ASPECT_KEYS as unknown as [string, ...string[]])`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test reviews`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/job.ts tests/reviews.test.ts
git commit -m "feat(reviews): reviewSchema con aspectos (Zod)"
```

---

## Task 4: Server Action `submitReview`

**Files:**
- Modify: `src/lib/actions/review.ts` (todo el cuerpo de `submitReview`)

**Interfaces:**
- Consumes: `reviewSchema` (Task 3), `reviewAspects`/`reviews`/`profiles`/`providerProfiles` (Task 2), `aspectKeysFor`, `generalFromAspects`, `ReviewDirection` (Task 1).
- Produces: `submitReview(input): Promise<ActionResult>` que inserta `reviews` (rating=promedio) + 4 `review_aspects` y recalcula el agregado del target (pro → `provider_profiles`, cliente → `profiles`).

- [ ] **Step 1: Reescribir `submitReview`**

Reemplazar el contenido de `src/lib/actions/review.ts` por:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { and, avg, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs, reviews, reviewAspects, profiles, providerProfiles } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { reviewSchema } from "@/lib/validations/job";
import {
  aspectKeysFor,
  generalFromAspects,
  type AspectKey,
  type ReviewDirection,
} from "@/lib/reviews/aspects";
import type { ActionResult } from "./provider";

/**
 * Reseña bidireccional de un trabajo completado. Una por parte (unique
 * job+author). El cliente puntúa al profesional y viceversa; el set de
 * aspectos depende de la dirección y se valida server-side (no se confía
 * en el cliente). La nota general = promedio de los 4 aspectos. Recalcula
 * el rating agregado del reseñado (pro en provider_profiles, cliente en
 * profiles).
 */
export async function submitReview(input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "No autorizado." };
  const uid = session.user.id;

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { jobId, targetId, aspects, comment } = parsed.data;

  const [job] = await db
    .select({ clientId: jobs.clientId, providerId: jobs.providerId, status: jobs.status })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);
  if (!job) return { ok: false, error: "Pedido no encontrado." };
  if (job.status !== "completed") {
    return { ok: false, error: "Solo se puede reseñar un trabajo completado." };
  }

  const isClient = uid === job.clientId;
  const isProvider = uid === job.providerId;
  if (!isClient && !isProvider) return { ok: false, error: "No autorizado." };

  const expectedTarget = isClient ? job.providerId : job.clientId;
  if (!expectedTarget || targetId !== expectedTarget) {
    return { ok: false, error: "Reseña inválida." };
  }

  // El set de aspectos debe ser EXACTAMENTE el de la dirección.
  const direction: ReviewDirection = isClient ? "client_to_provider" : "provider_to_client";
  const expectedKeys = aspectKeysFor(direction);
  const gotKeys = Object.keys(aspects);
  const sameSet =
    gotKeys.length === expectedKeys.length &&
    expectedKeys.every((k) => k in aspects);
  if (!sameSet) return { ok: false, error: "Reseña inválida." };

  const [existing] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.jobId, jobId), eq(reviews.authorId, uid)))
    .limit(1);
  if (existing) return { ok: false, error: "Ya dejaste tu reseña para este trabajo." };

  const general = generalFromAspects(expectedKeys.map((k) => aspects[k]!));
  const targetIsProvider = targetId === job.providerId;

  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(reviews)
      .values({
        jobId,
        authorId: uid,
        targetId,
        rating: String(general), // numeric column → string
        comment: comment?.trim() || null,
      })
      .returning({ id: reviews.id });

    await tx.insert(reviewAspects).values(
      expectedKeys.map((k) => ({
        reviewId: row!.id,
        aspect: k as AspectKey,
        score: aspects[k]!,
      })),
    );

    // Recalcular el agregado del reseñado (promedio de las notas generales).
    const [agg] = await tx
      .select({ average: avg(reviews.rating), count: sql<number>`count(*)::int` })
      .from(reviews)
      .where(eq(reviews.targetId, targetId));
    const avgStr = sql`round(${Number(agg?.average ?? general)}::numeric, 1)`;
    const count = Number(agg?.count ?? 1);

    if (targetIsProvider) {
      await tx
        .update(providerProfiles)
        .set({ ratingAvg: avgStr })
        .where(eq(providerProfiles.profileId, targetId));
    } else {
      await tx
        .update(profiles)
        .set({ ratingAvg: avgStr, ratingCount: count })
        .where(eq(profiles.id, targetId));
    }
  });

  revalidatePath(`/pedido/${jobId}`);
  revalidatePath(`/pro/pedido/${jobId}`);
  revalidatePath(`/profesional/${targetId}`);
  return { ok: true };
}
```

- [ ] **Step 2: Verificar tipos y lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS. (Confirmar que `reviews.rating` se setea como `String(general)` por ser numeric.)

- [ ] **Step 3: (Opcional, si hay `TEST_DATABASE_URL`) test de integración**

Extender `tests/helpers/test-db.ts` → `setupTestSchema` con las tablas `profiles`, `provider_profiles`, `reviews`, `review_aspects` + enum `review_aspect` (mismas columnas que el schema), y agregar `tests/integration/reviews.test.ts` que: crea un job `completed`, llama `submitReview` como cliente con los 4 aspectos del pro, y verifica (a) 1 fila en `reviews` con `rating` = promedio, (b) 4 filas en `review_aspects`, (c) `provider_profiles.rating_avg` recalculado, (d) segunda llamada del mismo autor → `{ ok:false }` por unique. Gatear con `describe.skipIf(!hasTestDb)`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/review.ts tests/
git commit -m "feat(reviews): submitReview con aspectos y recálculo bidireccional"
```

---

## Task 5: Queries de agregación y lectura

**Files:**
- Modify: `src/lib/db/queries.ts` (agregar funciones; ampliar `getJobReviewByAuthor`)

**Interfaces:**
- Consumes: `reviewAspects`/`reviews`/`profiles` (Task 2).
- Produces:
  - `getAspectAverages(targetId: string): Promise<{ aspect: string; avg: number; count: number }[]>`
  - `getClientReputation(clientId: string): Promise<{ ratingAvg: number; ratingCount: number } | null>`
  - `getJobReviewByAuthor(jobId, authorId)` ahora devuelve `{ id, rating, comment, aspects: { aspect: string; score: number }[] }` (o null).

- [ ] **Step 1: Agregar imports y funciones a `queries.ts`**

Agregar `reviewAspects` al import de `./schema` y `desc` a `drizzle-orm` si hiciera falta. Agregar al final del archivo:

```ts
/** Promedio por aspecto de todas las reseñas donde `targetId` es el reseñado. */
export async function getAspectAverages(
  targetId: string,
): Promise<{ aspect: string; avg: number; count: number }[]> {
  const rows = await db
    .select({
      aspect: reviewAspects.aspect,
      avg: sql<string>`round(avg(${reviewAspects.score})::numeric, 1)`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviewAspects)
    .innerJoin(reviews, eq(reviews.id, reviewAspects.reviewId))
    .where(eq(reviews.targetId, targetId))
    .groupBy(reviewAspects.aspect);
  return rows.map((r) => ({ aspect: r.aspect, avg: Number(r.avg), count: Number(r.count) }));
}

/** Reputación agregada del cliente (cacheada en profiles), o null si no existe. */
export async function getClientReputation(
  clientId: string,
): Promise<{ ratingAvg: number; ratingCount: number } | null> {
  const [p] = await db
    .select({ ratingAvg: profiles.ratingAvg, ratingCount: profiles.ratingCount })
    .from(profiles)
    .where(eq(profiles.id, clientId))
    .limit(1);
  return p ? { ratingAvg: Number(p.ratingAvg), ratingCount: p.ratingCount } : null;
}
```

- [ ] **Step 2: Ampliar `getJobReviewByAuthor` para incluir los aspectos**

Reemplazar la función existente (líneas ~236-247) por:

```ts
/** Reseña que dejó `authorId` sobre un trabajo (con su desglose), o null. */
export async function getJobReviewByAuthor(jobId: string, authorId: string) {
  const [review] = await db
    .select({ id: reviews.id, rating: reviews.rating, comment: reviews.comment })
    .from(reviews)
    .where(and(eq(reviews.jobId, jobId), eq(reviews.authorId, authorId)))
    .limit(1);
  if (!review) return null;

  const aspects = await db
    .select({ aspect: reviewAspects.aspect, score: reviewAspects.score })
    .from(reviewAspects)
    .where(eq(reviewAspects.reviewId, review.id));

  return { id: review.id, rating: Number(review.rating), comment: review.comment, aspects };
}
```

- [ ] **Step 3: Verificar**

Run: `pnpm typecheck`
Expected: PASS. (`getJobReviewByAuthor` ahora devuelve `rating: number`; lo consumen las dos páginas de pedido, que siguen pasándolo a `ReviewSummary` — se ajusta en Task 7.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/queries.ts
git commit -m "feat(reviews): queries de desglose por aspecto y reputación del cliente"
```

---

## Task 6: `ReviewForm` con 4 filas por dirección

**Files:**
- Modify: `src/components/shared/review-form.tsx`
- Modify: `src/app/(app)/pedido/[id]/page.tsx:69-73` y `src/app/(pro)/pro/pedido/[id]/page.tsx:57-61` (pasar `direction`)

**Interfaces:**
- Consumes: `aspectsFor`, `type ReviewDirection` (Task 1); `submitReview` (Task 4).
- Produces: `ReviewForm` recibe `{ jobId, targetId, targetLabel, direction }` y envía `{ jobId, targetId, aspects, comment }`.

- [ ] **Step 1: Reescribir `review-form.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { motion, useAnimate, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ease, spring } from "@/lib/motion";
import { submitReview } from "@/lib/actions/review";
import { aspectsFor, type ReviewDirection } from "@/lib/reviews/aspects";

/** Form de reseña por aspectos (4 × 1–5 estrellas + comentario) de un trabajo
 * completado. El set de aspectos depende de la dirección. */
export function ReviewForm({
  jobId,
  targetId,
  targetLabel,
  direction,
}: {
  jobId: string;
  targetId: string;
  targetLabel: string;
  direction: ReviewDirection;
}) {
  const aspects = aspectsFor(direction);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();
  const reduce = useReducedMotion();
  const [scope, animate] = useAnimate();

  const allScored = aspects.every((a) => scores[a.key] >= 1);

  function pick(key: string, value: number) {
    setScores((prev) => ({ ...prev, [key]: value }));
    if (reduce) return;
    for (let i = 1; i <= value; i++) {
      animate(
        `[data-star="${key}-${i}"]`,
        { scale: [1, 1.32, 1] },
        { duration: 0.3, delay: (i - 1) * 0.05, ease: ease.expo },
      );
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!allScored) {
      toast.error("Calificá los 4 aspectos.");
      return;
    }
    startTransition(async () => {
      const res = await submitReview({ jobId, targetId, aspects: scores, comment });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("¡Gracias por tu reseña!");
    });
  }

  return (
    <form
      onSubmit={submit}
      ref={scope}
      className="space-y-4 rounded-md border border-border bg-card p-4"
    >
      <p className="text-sm font-medium">¿Cómo fue tu experiencia con {targetLabel}?</p>

      <div className="space-y-3">
        {aspects.map((a) => {
          const current = scores[a.key] ?? 0;
          return (
            <div key={a.key} className="flex items-center justify-between gap-3">
              <Label className="text-sm text-muted-foreground">{a.label}</Label>
              <div
                className="flex items-center gap-1"
                role="radiogroup"
                aria-label={a.label}
              >
                {[1, 2, 3, 4, 5].map((value) => {
                  const active = value <= current;
                  return (
                    <motion.button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={current === value}
                      aria-label={`${a.label}: ${value} de 5`}
                      onClick={() => pick(a.key, value)}
                      className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      whileHover={reduce ? undefined : { scale: 1.18 }}
                      whileTap={reduce ? undefined : { scale: 0.85 }}
                      transition={spring.snappy}
                    >
                      <svg
                        data-star={`${a.key}-${value}`}
                        width="26"
                        height="26"
                        viewBox="0 0 24 24"
                        fill={active ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={cn(
                          "transition-colors duration-150",
                          active ? "text-warning" : "text-border",
                        )}
                        aria-hidden="true"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="review-comment">Comentario (opcional)</Label>
        <Textarea
          id="review-comment"
          placeholder="Contá cómo fue el trabajo…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending || !allScored}>
        {pending && (
          <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
        Enviar reseña
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Pasar `direction` en las dos páginas de pedido**

En `src/app/(app)/pedido/[id]/page.tsx`, el `<ReviewForm>` del cliente agrega `direction="client_to_provider"`:

```tsx
          <ReviewForm
            jobId={job.id}
            targetId={job.providerId}
            targetLabel={job.providerName ?? "el profesional"}
            direction="client_to_provider"
          />
```

En `src/app/(pro)/pro/pedido/[id]/page.tsx`, el del pro agrega `direction="provider_to_client"`:

```tsx
          <ReviewForm
            jobId={job.id}
            targetId={job.clientId}
            targetLabel={job.clientName ?? "el cliente"}
            direction="provider_to_client"
          />
```

- [ ] **Step 3: Verificar**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/review-form.tsx "src/app/(app)/pedido/[id]/page.tsx" "src/app/(pro)/pro/pedido/[id]/page.tsx"
git commit -m "feat(reviews): ReviewForm por aspectos según dirección"
```

---

## Task 7: `AspectBreakdown` + `ReviewSummary` con desglose

**Files:**
- Create: `src/components/shared/aspect-breakdown.tsx`
- Modify: `src/components/shared/review-summary.tsx`
- Modify: `src/app/(app)/pedido/[id]/page.tsx` y `src/app/(pro)/pro/pedido/[id]/page.tsx` (pasar `aspects` a `ReviewSummary`)

**Interfaces:**
- Consumes: `aspectLabel` (Task 1).
- Produces: `AspectBreakdown({ items })` donde `items: { aspect: string; score?: number; avg?: number }[]`; `ReviewSummary` acepta `aspects: { aspect: string; score: number }[]`.

- [ ] **Step 1: Crear `aspect-breakdown.tsx`**

```tsx
import { aspectLabel } from "@/lib/reviews/aspects";
import { RatingStars } from "./rating-stars";

/** Lista compacta de aspectos con su puntaje (una reseña) o promedio (agregado).
 * Reusada en el perfil del pro y en el desplegable de reputación del cliente. */
export function AspectBreakdown({
  items,
}: {
  items: { aspect: string; value: number }[];
}) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {items.map((it) => (
        <li
          key={it.aspect}
          className="flex items-center justify-between gap-3 text-sm"
        >
          <span className="text-muted-foreground">{aspectLabel(it.aspect)}</span>
          <span className="flex items-center gap-1.5">
            <RatingStars rating={it.value} showCount={false} />
            <span className="font-mono text-xs text-muted-foreground">
              {it.value.toFixed(1)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Reescribir `review-summary.tsx` para mostrar el desglose**

```tsx
"use client";

import { motion, useReducedMotion } from "motion/react";
import { RatingStars } from "./rating-stars";
import { AspectBreakdown } from "./aspect-breakdown";
import { ease } from "@/lib/motion";

/** Reseña ya enviada por el usuario actual sobre un trabajo (solo lectura). */
export function ReviewSummary({
  rating,
  comment,
  aspects,
}: {
  rating: number;
  comment: string | null;
  aspects: { aspect: string; score: number }[];
}) {
  const reduce = useReducedMotion();

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: ease.expo }}
      className="space-y-3 rounded-md border border-border bg-card p-4"
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Tu reseña</p>
      <div className="flex items-center gap-2">
        <RatingStars rating={rating} showCount={false} />
        <span className="font-mono text-xs text-muted-foreground">{rating.toFixed(1)}</span>
      </div>
      <AspectBreakdown items={aspects.map((a) => ({ aspect: a.aspect, value: a.score }))} />
      {comment && <p className="text-sm">{comment}</p>}
    </motion.section>
  );
}
```

- [ ] **Step 3: Pasar `aspects` a `ReviewSummary` en las dos páginas**

En ambas páginas de pedido, el render del summary pasa a:

```tsx
          <ReviewSummary
            rating={myReview.rating}
            comment={myReview.comment}
            aspects={myReview.aspects}
          />
```

(`myReview` ya trae `aspects` por la Task 5. `rating` ya es `number`.)

- [ ] **Step 4: Verificar**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/aspect-breakdown.tsx src/components/shared/review-summary.tsx "src/app/(app)/pedido/[id]/page.tsx" "src/app/(pro)/pro/pedido/[id]/page.tsx"
git commit -m "feat(reviews): desglose por aspecto en el resumen de reseña"
```

---

## Task 8: Desglose por aspecto en el perfil del profesional

**Files:**
- Modify: `src/app/(app)/profesional/[id]/page.tsx`

**Interfaces:**
- Consumes: `getAspectAverages` (Task 5), `AspectBreakdown` (Task 7).

- [ ] **Step 1: Cargar los promedios por aspecto**

En el `Promise.all` existente (línea ~50) agregar `getAspectAverages(id)`. Importar la función y el componente arriba:

```ts
import { getAspectAverages } from "@/lib/db/queries";
import { AspectBreakdown } from "@/components/shared/aspect-breakdown";
```

```ts
  const [cats, reviewList, aspectAverages] = await Promise.all([
    /* …cats… */,
    /* …reviewList… */,
    getAspectAverages(id),
  ]);
```

- [ ] **Step 2: Renderizar el desglose debajo del rating general**

Después del bloque de `RatingStars` del encabezado (línea ~104), agregar:

```tsx
            {aspectAverages.length > 0 && (
              <div className="mt-3 rounded-md border border-border/60 bg-background p-3">
                <AspectBreakdown
                  items={aspectAverages.map((a) => ({ aspect: a.aspect, value: a.avg }))}
                />
              </div>
            )}
```

Además, como `reviews.rating` ahora es numeric (string), donde se usa `rating={r.rating}` (línea ~156) cambiar a `rating={Number(r.rating)}`.

- [ ] **Step 3: Verificar**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/profesional/[id]/page.tsx"
git commit -m "feat(reviews): desglose por aspecto en el perfil del profesional"
```

---

## Task 9: Reputación del cliente (desplegable) para el profesional

**Files:**
- Create: `src/components/pro/client-reputation.tsx`
- Modify: `src/app/(pro)/pro/pedido/[id]/page.tsx`

**Interfaces:**
- Consumes: `getClientReputation`, `getAspectAverages` (Task 5); `AspectBreakdown` (Task 7); `RatingStars`.
- Produces: `ClientReputation({ ratingAvg, ratingCount, aspects })` client component con toggle "Ver detalle".

- [ ] **Step 1: Crear `client-reputation.tsx`**

```tsx
"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { RatingStars } from "@/components/shared/rating-stars";
import { AspectBreakdown } from "@/components/shared/aspect-breakdown";
import { cn } from "@/lib/utils";

/** Reputación del cliente que ve el profesional: nota general por defecto y un
 * desplegable "Ver detalle" con el desglose por aspecto. */
export function ClientReputation({
  ratingAvg,
  ratingCount,
  aspects,
}: {
  ratingAvg: number;
  ratingCount: number;
  aspects: { aspect: string; value: number }[];
}) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const isNew = ratingCount === 0;

  return (
    <section className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Cliente</p>
          <div className="mt-1">
            {isNew ? (
              <span className="text-sm text-muted-foreground">Nuevo · sin calificaciones</span>
            ) : (
              <RatingStars rating={ratingAvg} count={ratingCount} size="md" />
            )}
          </div>
        </div>
        {!isNew && aspects.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex items-center gap-1 text-sm font-medium text-primary"
          >
            Ver detalle
            <ChevronDown
              className={cn("size-4 transition-transform", open && "rotate-180")}
            />
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-3 border-t border-border/60 pt-3">
              <AspectBreakdown items={aspects} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
```

- [ ] **Step 2: Montar en el detalle del pedido del pro**

En `src/app/(pro)/pro/pedido/[id]/page.tsx`: importar y cargar la reputación del cliente, y renderizarla (p. ej. encima de `ProviderJobActions`). Imports:

```ts
import { getClientReputation, getAspectAverages } from "@/lib/db/queries";
import { ClientReputation } from "@/components/pro/client-reputation";
```

Ampliar el `Promise.all` (línea ~30) para traer también la reputación y el desglose del cliente:

```ts
  const [chatMessages, myReview, clientRep, clientAspects] = await Promise.all([
    showChat ? getJobMessages(job.id) : Promise.resolve([]),
    job.status === "completed"
      ? getJobReviewByAuthor(job.id, user.id)
      : Promise.resolve(null),
    getClientReputation(job.clientId),
    getAspectAverages(job.clientId),
  ]);
```

Renderizar antes de `<ProviderJobActions …>`:

```tsx
      {clientRep && (
        <ClientReputation
          ratingAvg={clientRep.ratingAvg}
          ratingCount={clientRep.ratingCount}
          aspects={clientAspects.map((a) => ({ aspect: a.aspect, value: a.avg }))}
        />
      )}
```

- [ ] **Step 3: Verificar**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/pro/client-reputation.tsx "src/app/(pro)/pro/pedido/[id]/page.tsx"
git commit -m "feat(reviews): reputación del cliente con desplegable para el pro"
```

---

## Task 10: Verificación integral

- [ ] **Step 1: Suite completa**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: todo verde (incluye `tests/reviews.test.ts`).

- [ ] **Step 2: Verificación manual (`pnpm dev`)**

Con la migración aplicada en la DB de dev:
- Completar un trabajo y, como **cliente**, reseñar al pro: 4 filas de estrellas (Puntualidad/Calidad/Trato/Precio), botón habilitado solo con los 4; al enviar, el resumen muestra el desglose.
- Como **profesional**, reseñar al cliente: 4 filas (Trato/Puntualidad/Claridad/Pago).
- En el **perfil del pro** (`/profesional/[id]`): nota general + desglose por aspecto.
- En el **detalle del pedido del pro**: la reputación del cliente (nota general) con "Ver detalle" que expande el desglose; un cliente sin reseñas muestra "Nuevo · sin calificaciones".

- [ ] **Step 3: Commit final (si quedaron ajustes)**

```bash
git add -A
git commit -m "chore(reviews): ajustes de verificación"
```

---

## Notas de despliegue

- Aplicar la migración a prod por el **Session pooler** (`MIGRATION_DATABASE_URL`), `pnpm db:migrate`, y luego correr el bloque nuevo de `drizzle/postgis.sql` (CHECK + RLS de `review_aspects`, nuevo CHECK de `reviews.rating`). **Nunca `db:push`**. (CLAUDE.md)
- Sin backfill: las reseñas viejas conservan su `rating` (ahora numeric) y no aportan al desglose por aspecto.
