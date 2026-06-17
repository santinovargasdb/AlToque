# Plan de implementación — Step 9a: Pagos Mercado Pago (escrow, "money in, refundable")

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El cliente que paga por transferencia/tarjeta prepaga el precio estimado a la cuenta de Mercado Pago de AlToque; el dinero queda *retenido* (`held`) y es *totalmente reintegrable* hasta que el trabajo se complete (Step 9b) o se cancele/expire.

**Architecture:** `createJob` (transfer/card) crea una preferencia de Checkout Pro contra el access token de AlToque y redirige al cliente; un webhook con firma verificada e idempotente marca el pago como `held`; cancelar o expirar un trabajo pagado dispara un reintegro total. La urgencia transmite de inmediato (broadcast) y la seguridad se logra **bloqueando el avance** (`in_progress`) hasta que haya pago, no bloqueando la visibilidad. **No** hay lógica de liquidación ni escritura en `commission_ledger` en esta etapa (eso es 9b).

**Tech Stack:** Next.js 15 (App Router, Server Actions, Route Handlers), Drizzle ORM + postgres-js, SDK `mercadopago` v2.13.0 (`Preference`, `Payment`, `PaymentRefund`, `WebhookSignatureValidator`), Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-17-step-9a-mp-payments-escrow-design.md`

**Convención de commits:** todo commit termina con el trailer
`Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## Estructura de archivos

**Crear:**
- `src/lib/mercadopago/client.ts` — config del SDK con el access token de AlToque (lanza si falta).
- `src/lib/mercadopago/preference.ts` — `buildJobPreferenceBody()` (puro) + `createJobPreference()`.
- `src/lib/mercadopago/webhook.ts` — `isValidWebhookSignature()` + `fetchPaymentInfo()`.
- `src/lib/mercadopago/refund.ts` — `refundJobPayment()` (reintegro total).
- `src/lib/mercadopago/payments.ts` — `markPaymentHeld()` (transición DB idempotente).
- `src/app/api/webhooks/mercadopago/route.ts` — handler POST del webhook.
- `src/components/app/job-payment-panel.tsx` — badge de estado + CTA "Pagar" + toast de back-url.
- `tests/payments.test.ts` — unit (schema, builder de preferencia, verificación de firma).
- `tests/integration/payments.test.ts` — integración (createJob prepago, held idempotente, gate, refund).

**Modificar:**
- `src/lib/validations/job.ts` — `priceEstimate` + refine.
- `src/lib/actions/job.ts` — `createJob` (rama prepago + `redirectUrl`); `updateJobStatus` (gate `in_progress` + refund al cancelar).
- `src/components/app/new-order-wizard.tsx` — input de estimado + redirección a Checkout.
- `src/lib/db/queries.ts` — `JobDetail` gana `priceEstimate` + `mpPreferenceId`.
- `src/app/(app)/pedido/[id]/page.tsx` — montar `JobPaymentPanel`.
- `src/app/(pro)/pro/pedido/[id]/page.tsx` — pasar `paymentMethod`/`paymentStatus` a las acciones.
- `src/components/pro/provider-job-actions.tsx` — gate "Iniciar" + banner "Esperando pago".
- `src/app/api/cron/expire-jobs/route.ts` — expirar urgentes sin pagar + reintegrar held expirados.
- `drizzle/postgis.sql` — índice único parcial sobre `jobs.mp_payment_id`.
- `tests/helpers/test-db.ts` — mismo índice único parcial (fidelidad del test de idempotencia).

---

## Task 1: Índice único parcial sobre `jobs.mp_payment_id` (guardia de idempotencia)

**Files:**
- Modify: `drizzle/postgis.sql` (al final, antes del bloque de Realtime)
- Modify: `tests/helpers/test-db.ts:89` (después de crear la tabla `jobs`)

- [ ] **Step 1: Agregar el índice en `drizzle/postgis.sql`**

Insertar justo antes del comentario `-- ════…` de Realtime (línea ~212):

```sql
-- ════════════════════════════════════════════════════════════
-- Pagos (Step 9): idempotencia del webhook por mp_payment_id.
-- Único parcial: muchos jobs tienen mp_payment_id NULL (cash / sin pagar).
-- ════════════════════════════════════════════════════════════
create unique index if not exists uq_jobs_mp_payment_id
  on jobs (mp_payment_id)
  where mp_payment_id is not null;
```

- [ ] **Step 2: Reflejar el índice en la DB de test**

En `tests/helpers/test-db.ts`, dentro del bloque `setupTestSchema`, justo después del `);` que cierra `create table jobs (...)` (línea ~89) y antes de `create table job_dispatch`, agregar:

```sql
    create unique index uq_jobs_mp_payment_id
      on jobs (mp_payment_id) where mp_payment_id is not null;
```

- [ ] **Step 3: Verificar que el SQL es válido (typecheck del repo no cubre SQL; chequeo manual)**

Run: `pnpm typecheck`
Expected: PASS (sin cambios de TS todavía).

- [ ] **Step 4: Commit**

```bash
git add drizzle/postgis.sql tests/helpers/test-db.ts
git commit -m "feat(pagos): índice único parcial en jobs.mp_payment_id (idempotencia webhook)"
```

---

## Task 2: `priceEstimate` en la validación de `createJob`

**Files:**
- Modify: `src/lib/validations/job.ts:21-37`
- Test: `tests/payments.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/payments.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createJobSchema } from "@/lib/validations/job";

const base = {
  categoryId: "11111111-1111-1111-1111-111111111111",
  type: "scheduled" as const,
  title: "Pérdida de agua",
  addressText: "Av. Siempreviva 742",
  scheduledAt: new Date(Date.now() + 86_400_000),
  photos: [],
};

describe("createJobSchema · priceEstimate", () => {
  it("exige priceEstimate > 0 cuando el pago es transfer/card", () => {
    const r = createJobSchema.safeParse({ ...base, paymentMethod: "transfer" });
    expect(r.success).toBe(false);
  });

  it("acepta transfer/card con priceEstimate válido", () => {
    const r = createJobSchema.safeParse({
      ...base,
      paymentMethod: "transfer",
      priceEstimate: 15000,
    });
    expect(r.success).toBe(true);
  });

  it("no exige priceEstimate cuando el pago es cash", () => {
    const r = createJobSchema.safeParse({ ...base, paymentMethod: "cash" });
    expect(r.success).toBe(true);
  });
});
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `pnpm test -- tests/payments.test.ts`
Expected: FAIL (el primer caso pasa el parse porque todavía no existe el refine).

- [ ] **Step 3: Implementar `priceEstimate` + refine**

En `src/lib/validations/job.ts`, agregar el campo dentro del `.object({...})` de `createJobSchema` (después de `providerId`):

```ts
    providerId: z.string().uuid().optional(),
    priceEstimate: z.coerce.number().positive().max(100_000_000).optional(),
```

Y encadenar un segundo `.refine` después del existente de `scheduledAt`:

```ts
  .refine(
    (d) => d.type !== "scheduled" || !!d.scheduledAt,
    { message: "Elegí fecha y hora para un trabajo agendado", path: ["scheduledAt"] },
  )
  .refine(
    (d) => d.paymentMethod === "cash" || (d.priceEstimate ?? 0) > 0,
    {
      message: "Ingresá un precio estimado para pagar por la app",
      path: ["priceEstimate"],
    },
  );
```

- [ ] **Step 4: Correr el test para verlo pasar**

Run: `pnpm test -- tests/payments.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/job.ts tests/payments.test.ts
git commit -m "feat(pagos): priceEstimate requerido para pagos transfer/card"
```

---

## Task 3: Config del SDK de Mercado Pago

**Files:**
- Create: `src/lib/mercadopago/client.ts`

- [ ] **Step 1: Implementar el factory de config**

```ts
import "server-only";
import { MercadoPagoConfig } from "mercadopago";

/**
 * Config del SDK de MP usando el access token de AlToque (cuenta marketplace).
 * Lee process.env directo (sin lib/env) para no acoplar los módulos de pago a
 * la validación global; lanza un error claro si falta el token cuando se usa.
 */
export function mpConfig(): MercadoPagoConfig {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MP_ACCESS_TOKEN no configurado: pagos no disponibles.");
  }
  return new MercadoPagoConfig({ accessToken });
}
```

- [ ] **Step 2: Verificar tipos**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/mercadopago/client.ts
git commit -m "feat(pagos): config del SDK de Mercado Pago (mpConfig)"
```

---

## Task 4: Builder + creación de la preferencia de Checkout Pro

**Files:**
- Create: `src/lib/mercadopago/preference.ts`
- Test: `tests/payments.test.ts` (agregar bloque)

- [ ] **Step 1: Escribir el test que falla (builder puro)**

Agregar al final de `tests/payments.test.ts`:

```ts
import { buildJobPreferenceBody } from "@/lib/mercadopago/preference";

describe("buildJobPreferenceBody", () => {
  const body = buildJobPreferenceBody({
    jobId: "job-1",
    title: "Pérdida de agua",
    amount: 15000,
    appUrl: "https://altoque.app",
  });

  it("arma un item ARS con el monto del estimado", () => {
    expect(body.items[0]).toMatchObject({
      id: "job-1",
      title: "Pérdida de agua",
      quantity: 1,
      unit_price: 15000,
      currency_id: "ARS",
    });
  });

  it("setea external_reference, notification_url y back_urls del job", () => {
    expect(body.external_reference).toBe("job-1");
    expect(body.notification_url).toBe(
      "https://altoque.app/api/webhooks/mercadopago",
    );
    expect(body.back_urls).toEqual({
      success: "https://altoque.app/pedido/job-1?pago=success",
      pending: "https://altoque.app/pedido/job-1?pago=pending",
      failure: "https://altoque.app/pedido/job-1?pago=failure",
    });
    expect(body.auto_return).toBe("approved");
  });
});
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `pnpm test -- tests/payments.test.ts`
Expected: FAIL ("Cannot find module '@/lib/mercadopago/preference'").

- [ ] **Step 3: Implementar `preference.ts`**

```ts
import "server-only";
import { Preference } from "mercadopago";
import { mpConfig } from "./client";

export type JobPreferenceParams = {
  jobId: string;
  title: string;
  amount: number;
  appUrl: string;
};

/** Construye el body de la preferencia de Checkout Pro para un pedido. (puro) */
export function buildJobPreferenceBody(p: JobPreferenceParams) {
  const back = `${p.appUrl}/pedido/${p.jobId}`;
  return {
    items: [
      {
        id: p.jobId,
        title: p.title,
        quantity: 1,
        unit_price: p.amount,
        currency_id: "ARS",
      },
    ],
    external_reference: p.jobId,
    notification_url: `${p.appUrl}/api/webhooks/mercadopago`,
    back_urls: {
      success: `${back}?pago=success`,
      pending: `${back}?pago=pending`,
      failure: `${back}?pago=failure`,
    },
    auto_return: "approved",
  };
}

export type CreatedPreference = { preferenceId: string; initPoint: string };

/** Crea la preferencia en MP y devuelve { preferenceId, initPoint }. */
export async function createJobPreference(
  p: JobPreferenceParams,
): Promise<CreatedPreference> {
  const pref = new Preference(mpConfig());
  const res = await pref.create({ body: buildJobPreferenceBody(p) });
  if (!res.id || !res.init_point) {
    throw new Error("MP no devolvió id/init_point para la preferencia.");
  }
  return { preferenceId: res.id, initPoint: res.init_point };
}
```

- [ ] **Step 4: Correr el test para verlo pasar**

Run: `pnpm test -- tests/payments.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mercadopago/preference.ts tests/payments.test.ts
git commit -m "feat(pagos): builder y creación de preferencia de Checkout Pro"
```

---

## Task 5: Verificación de firma del webhook + consulta del pago

**Files:**
- Create: `src/lib/mercadopago/webhook.ts`
- Test: `tests/payments.test.ts` (agregar bloque)

- [ ] **Step 1: Escribir el test que falla (mockeando el validador del SDK)**

Primero, actualizar la línea de import de vitest del archivo para incluir `beforeEach` y `vi`
(sin duplicar imports):

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
```

Agregar al inicio de `tests/payments.test.ts` (debajo de los imports) los mocks hoisted:

```ts
const mp = vi.hoisted(() => ({ validate: vi.fn() }));
vi.mock("mercadopago", async (orig) => {
  const actual = await orig<typeof import("mercadopago")>();
  class FakeInvalid extends Error {}
  return {
    ...actual,
    WebhookSignatureValidator: { validate: mp.validate },
    InvalidWebhookSignatureError: FakeInvalid,
  };
});
```

Y al final del archivo, el bloque de tests:

```ts
import {
  isValidWebhookSignature,
} from "@/lib/mercadopago/webhook";
import { InvalidWebhookSignatureError } from "mercadopago";

describe("isValidWebhookSignature", () => {
  const input = { xSignature: "ts=1,v1=abc", xRequestId: "req-1", dataId: "123" };

  beforeEach(() => {
    mp.validate.mockReset();
    process.env.MP_WEBHOOK_SECRET = "secret";
  });

  it("devuelve true cuando el validador no lanza", () => {
    mp.validate.mockReturnValue(undefined);
    expect(isValidWebhookSignature(input)).toBe(true);
  });

  it("devuelve false ante firma inválida", () => {
    mp.validate.mockImplementation(() => {
      throw new InvalidWebhookSignatureError("bad");
    });
    expect(isValidWebhookSignature(input)).toBe(false);
  });

  it("devuelve false si falta el secreto", () => {
    delete process.env.MP_WEBHOOK_SECRET;
    expect(isValidWebhookSignature(input)).toBe(false);
    expect(mp.validate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `pnpm test -- tests/payments.test.ts`
Expected: FAIL ("Cannot find module '@/lib/mercadopago/webhook'").

- [ ] **Step 3: Implementar `webhook.ts`**

```ts
import "server-only";
import {
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
  Payment,
} from "mercadopago";
import { mpConfig } from "./client";

const TOLERANCE_SECONDS = 300;

export type WebhookSignatureInput = {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
};

/**
 * Verifica la firma HMAC del webhook de MP usando el validador oficial del SDK.
 * Devuelve false si falta el secreto o la firma es inválida (no lanza).
 */
export function isValidWebhookSignature(input: WebhookSignatureInput): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return false;
  try {
    WebhookSignatureValidator.validate({
      xSignature: input.xSignature,
      xRequestId: input.xRequestId,
      dataId: input.dataId,
      secret,
      toleranceSeconds: TOLERANCE_SECONDS,
    });
    return true;
  } catch (e) {
    if (e instanceof InvalidWebhookSignatureError) return false;
    throw e;
  }
}

export type PaymentInfo = {
  paymentId: string;
  status: string;
  jobId: string | null;
};

/** Consulta el pago en MP y extrae status + jobId (external_reference). */
export async function fetchPaymentInfo(paymentId: string): Promise<PaymentInfo> {
  const payment = new Payment(mpConfig());
  const res = await payment.get({ id: paymentId });
  return {
    paymentId,
    status: res.status ?? "unknown",
    jobId: res.external_reference ?? null,
  };
}
```

- [ ] **Step 4: Correr el test para verlo pasar**

Run: `pnpm test -- tests/payments.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mercadopago/webhook.ts tests/payments.test.ts
git commit -m "feat(pagos): verificación de firma e info de pago del webhook MP"
```

---

## Task 6: Reintegro total + transición DB `markPaymentHeld`

**Files:**
- Create: `src/lib/mercadopago/refund.ts`
- Create: `src/lib/mercadopago/payments.ts`

- [ ] **Step 1: Implementar `refund.ts`**

```ts
import "server-only";
import { PaymentRefund } from "mercadopago";
import { mpConfig } from "./client";

/** Reintegro TOTAL de un pago de MP (devuelve el monto retenido al cliente). */
export async function refundJobPayment(mpPaymentId: string): Promise<void> {
  const refunds = new PaymentRefund(mpConfig());
  await refunds.total({ payment_id: mpPaymentId });
}
```

- [ ] **Step 2: Implementar `payments.ts` (transición idempotente)**

```ts
import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";

/**
 * Marca el pago de un job como retenido. Idempotente: el `isNull(mp_payment_id)`
 * garantiza que sólo la primera entrega del webhook transiciona (las repetidas
 * encuentran mp_payment_id ya seteado y no hacen nada).
 * @returns true si transicionó, false si ya estaba marcado.
 */
export async function markPaymentHeld(
  jobId: string,
  mpPaymentId: string,
): Promise<boolean> {
  const rows = await db
    .update(jobs)
    .set({ paymentStatus: "held", mpPaymentId, updatedAt: new Date() })
    .where(and(eq(jobs.id, jobId), isNull(jobs.mpPaymentId)))
    .returning({ id: jobs.id });
  return rows.length > 0;
}
```

- [ ] **Step 3: Verificar tipos**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/mercadopago/refund.ts src/lib/mercadopago/payments.ts
git commit -m "feat(pagos): reintegro total y transición held idempotente"
```

---

## Task 7: `createJob` — rama prepago (preferencia + redirectUrl)

**Files:**
- Modify: `src/lib/actions/job.ts:20-148`
- Test: `tests/integration/payments.test.ts`

- [ ] **Step 1: Escribir el test de integración que falla**

Crear `tests/integration/payments.test.ts`:

```ts
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import {
  hasTestDb,
  rawClient,
  setupTestSchema,
  truncateAll,
  type RawClient,
} from "../helpers/test-db";

type Session = { user: { id: string }; role: "client" | "provider" | "admin" } | null;
let currentSession: Session = null;

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(async () => currentSession),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/maps/geocode", () => ({ geocodeAddress: vi.fn(async () => null) }));
vi.mock("@/lib/notifications/dispatch", () => ({
  dispatchNewUrgentJob: vi.fn(async () => {}),
}));
vi.mock("@/lib/db/queries", () => ({ findNearbyProviders: vi.fn() }));

const createJobPreference = vi.fn();
vi.mock("@/lib/mercadopago/preference", () => ({ createJobPreference }));
const refundJobPayment = vi.fn();
vi.mock("@/lib/mercadopago/refund", () => ({ refundJobPayment }));

const CLIENT = "11111111-1111-1111-1111-111111111111";
const PROVIDER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const CATEGORY = "cccccccc-cccc-cccc-cccc-cccccccccccc";

describe.skipIf(!hasTestDb)("pagos MP (integración)", () => {
  let sql: RawClient;
  let createJob: typeof import("@/lib/actions/job").createJob;

  beforeAll(async () => {
    sql = rawClient();
    await setupTestSchema(sql);
    ({ createJob } = await import("@/lib/actions/job"));
  });

  afterAll(async () => {
    await sql.end();
  });

  beforeEach(async () => {
    await truncateAll(sql);
    currentSession = null;
    createJobPreference.mockReset();
    refundJobPayment.mockReset();
  });

  it("createJob prepago deja el pedido en pending con mpPreferenceId y devuelve redirectUrl", async () => {
    currentSession = { user: { id: CLIENT }, role: "client" };
    createJobPreference.mockResolvedValue({
      preferenceId: "pref_1",
      initPoint: "https://mp/redirect/pref_1",
    });

    const res = await createJob({
      categoryId: CATEGORY,
      type: "scheduled",
      title: "Cambio de termotanque",
      addressText: "Av. Siempreviva 742",
      lat: -34.6,
      lng: -58.4,
      scheduledAt: new Date(Date.now() + 86_400_000),
      paymentMethod: "transfer",
      priceEstimate: 15000,
      providerId: PROVIDER_A,
      photos: [],
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.redirectUrl).toBe("https://mp/redirect/pref_1");

    const [job] = await sql<{ payment_status: string; mp_preference_id: string }[]>`
      select payment_status, mp_preference_id from jobs where id = ${res.jobId}`;
    expect(job!.payment_status).toBe("pending");
    expect(job!.mp_preference_id).toBe("pref_1");
  });
});
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `TEST_DATABASE_URL=postgresql://localhost/altoque_test pnpm test -- tests/integration/payments.test.ts`
Expected: FAIL (`res.redirectUrl` undefined / `mp_preference_id` null — `createJob` no crea preferencia todavía).
(Sin `TEST_DATABASE_URL` el bloque se saltea y queda verde.)

- [ ] **Step 3: Reescribir `createJob` con la rama prepago**

Reemplazar el bloque completo desde `export type CreateJobResult` hasta el cierre de `createJob` (líneas 20-148) por:

```ts
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
```

Agregar el import de `createJobPreference` arriba (junto a los otros imports de `@/lib/mercadopago/...`):

```ts
import { createJobPreference } from "@/lib/mercadopago/preference";
```

- [ ] **Step 4: Correr el test para verlo pasar**

Run: `TEST_DATABASE_URL=postgresql://localhost/altoque_test pnpm test -- tests/integration/payments.test.ts`
Expected: PASS.

- [ ] **Step 5: Verificar tipos y suite completa**

Run: `pnpm typecheck && pnpm test`
Expected: PASS (los tests de integración se saltean sin `TEST_DATABASE_URL`).

- [ ] **Step 6: Commit**

```bash
git add src/lib/actions/job.ts tests/integration/payments.test.ts
git commit -m "feat(pagos): createJob crea preferencia y redirige a Checkout (escrow)"
```

---

## Task 8: Handler del webhook `POST /api/webhooks/mercadopago`

**Files:**
- Create: `src/app/api/webhooks/mercadopago/route.ts`
- Test: `tests/integration/payments.test.ts` (agregar caso de `markPaymentHeld`)

- [ ] **Step 1: Escribir el test de idempotencia que falla**

Agregar dentro del `describe.skipIf(...)` de `tests/integration/payments.test.ts`:

```ts
  it("markPaymentHeld es idempotente: la 2da entrega no re-transiciona", async () => {
    const { markPaymentHeld } = await import("@/lib/mercadopago/payments");
    const [job] = await sql<{ id: string }[]>`
      insert into jobs
        (client_id, category_id, type, status, title, payment_method, payment_status, commission_rate)
      values
        (${CLIENT}, ${CATEGORY}, 'scheduled', 'requested', 'Test', 'transfer', 'pending', '0.120')
      returning id`;

    const first = await markPaymentHeld(job!.id, "pay_1");
    const second = await markPaymentHeld(job!.id, "pay_1");

    expect(first).toBe(true);
    expect(second).toBe(false);

    const [row] = await sql<{ payment_status: string; mp_payment_id: string }[]>`
      select payment_status, mp_payment_id from jobs where id = ${job!.id}`;
    expect(row!.payment_status).toBe("held");
    expect(row!.mp_payment_id).toBe("pay_1");
  });
```

- [ ] **Step 2: Correr el test para verlo fallar/pasar**

Run: `TEST_DATABASE_URL=postgresql://localhost/altoque_test pnpm test -- tests/integration/payments.test.ts`
Expected: PASS (`markPaymentHeld` ya existe de la Task 6; este caso fija su contrato de idempotencia). Si falla, revisar Task 6.

- [ ] **Step 3: Implementar el route handler**

```ts
import { NextResponse, type NextRequest } from "next/server";
import {
  isValidWebhookSignature,
  fetchPaymentInfo,
} from "@/lib/mercadopago/webhook";
import { markPaymentHeld } from "@/lib/mercadopago/payments";

/**
 * Webhook de Mercado Pago (Checkout Pro). Verifica la firma (regla #2),
 * consulta el pago y, si está aprobado, marca el job como 'held' de forma
 * idempotente (por mp_payment_id). Responde 200 rápido salvo firma inválida.
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id");
  const type = url.searchParams.get("type") ?? url.searchParams.get("topic");

  if (
    !isValidWebhookSignature({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
    })
  ) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  // Sólo nos interesan notificaciones de pago con id.
  if (type !== "payment" || !dataId) {
    return NextResponse.json({ ok: true });
  }

  const info = await fetchPaymentInfo(dataId);
  if (info.status === "approved" && info.jobId) {
    await markPaymentHeld(info.jobId, info.paymentId);
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Verificar tipos y build de la ruta**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/webhooks/mercadopago/route.ts tests/integration/payments.test.ts
git commit -m "feat(pagos): webhook MP con firma verificada e idempotencia -> held"
```

---

## Task 9: Gate de `in_progress` + reintegro al cancelar (`updateJobStatus`)

**Files:**
- Modify: `src/lib/actions/job.ts:150-215` (`updateJobStatus`)
- Test: `tests/integration/payments.test.ts` (agregar 2 casos)

- [ ] **Step 1: Escribir los tests que fallan**

Agregar dentro del `describe.skipIf(...)`:

```ts
  it("bloquea iniciar (in_progress) un pedido prepago sin pago retenido", async () => {
    const { updateJobStatus } = await import("@/lib/actions/job");
    const [job] = await sql<{ id: string }[]>`
      insert into jobs
        (client_id, provider_id, category_id, type, status, title, payment_method, payment_status, commission_rate)
      values
        (${CLIENT}, ${PROVIDER_A}, 'urgent', 'accepted', 'Test', 'transfer', 'pending', '0.120')
      returning id`;
    currentSession = { user: { id: PROVIDER_A }, role: "provider" };

    const blocked = await updateJobStatus({ jobId: job!.id, status: "in_progress" });
    expect(blocked.ok).toBe(false);

    await sql`update jobs set payment_status='held', mp_payment_id='pay_x' where id=${job!.id}`;
    const ok = await updateJobStatus({ jobId: job!.id, status: "in_progress" });
    expect(ok.ok).toBe(true);

    const [row] = await sql<{ status: string }[]>`select status from jobs where id=${job!.id}`;
    expect(row!.status).toBe("in_progress");
  });

  it("cancelar un pedido con pago retenido dispara reintegro y queda refunded", async () => {
    const { updateJobStatus } = await import("@/lib/actions/job");
    refundJobPayment.mockResolvedValue(undefined);
    const [job] = await sql<{ id: string }[]>`
      insert into jobs
        (client_id, provider_id, category_id, type, status, title, payment_method, payment_status, mp_payment_id, commission_rate)
      values
        (${CLIENT}, ${PROVIDER_A}, 'scheduled', 'accepted', 'Test', 'transfer', 'held', 'pay_9', '0.120')
      returning id`;
    currentSession = { user: { id: CLIENT }, role: "client" };

    const res = await updateJobStatus({ jobId: job!.id, status: "cancelled" });
    expect(res.ok).toBe(true);
    expect(refundJobPayment).toHaveBeenCalledWith("pay_9");

    const [row] = await sql<{ status: string; payment_status: string }[]>`
      select status, payment_status from jobs where id=${job!.id}`;
    expect(row!.status).toBe("cancelled");
    expect(row!.payment_status).toBe("refunded");
  });
```

- [ ] **Step 2: Correr los tests para verlos fallar**

Run: `TEST_DATABASE_URL=postgresql://localhost/altoque_test pnpm test -- tests/integration/payments.test.ts`
Expected: FAIL (sin gate, `in_progress` pasa; sin refund, `payment_status` queda 'held').

- [ ] **Step 3: Modificar `updateJobStatus`**

Agregar el import de `refundJobPayment` arriba en `job.ts`:

```ts
import { refundJobPayment } from "@/lib/mercadopago/refund";
```

Reemplazar el `select` del job y las ramas `in_progress` / `cancelled` dentro de `updateJobStatus`. El `select` (líneas ~162-170) pasa a incluir los campos de pago:

```ts
  const [job] = await db
    .select({
      clientId: jobs.clientId,
      providerId: jobs.providerId,
      status: jobs.status,
      paymentMethod: jobs.paymentMethod,
      paymentStatus: jobs.paymentStatus,
      mpPaymentId: jobs.mpPaymentId,
    })
    .from(jobs)
    .where(eq(jobs.id, params.jobId))
    .limit(1);
```

La rama `in_progress` (gate de pago):

```ts
  } else if (params.status === "in_progress") {
    if (!isProvider || job.status !== "accepted") {
      return { ok: false, error: "El pedido debe estar aceptado." };
    }
    if (job.paymentMethod !== "cash" && job.paymentStatus !== "held") {
      return {
        ok: false,
        error: "Esperá a que el cliente complete el pago para iniciar.",
      };
    }
    await db
      .update(jobs)
      .set({ status: "in_progress", updatedAt: now })
      .where(eq(jobs.id, params.jobId));
  } else if (params.status === "cancelled") {
    if (!["requested", "accepted", "in_progress"].includes(job.status)) {
      return { ok: false, error: "El pedido ya no se puede cancelar." };
    }
    // Reintegro si el dinero estaba retenido. Si MP falla, NO cancelamos
    // (no dejamos el dinero "perdido" en estado) y devolvemos error.
    let paymentStatus = job.paymentStatus;
    if (job.paymentStatus === "held" && job.mpPaymentId) {
      try {
        await refundJobPayment(job.mpPaymentId);
        paymentStatus = "refunded";
      } catch {
        return {
          ok: false,
          error: "No pudimos reintegrar el pago. Intentá de nuevo en un momento.",
        };
      }
    }
    await db
      .update(jobs)
      .set({
        status: "cancelled",
        paymentStatus,
        cancelReason: params.reason ?? null,
        updatedAt: now,
      })
      .where(eq(jobs.id, params.jobId));
  }
```

> Mantener la rama `accepted` existente sin cambios.

- [ ] **Step 4: Correr los tests para verlos pasar**

Run: `TEST_DATABASE_URL=postgresql://localhost/altoque_test pnpm test -- tests/integration/payments.test.ts`
Expected: PASS.

- [ ] **Step 5: typecheck + suite**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/actions/job.ts tests/integration/payments.test.ts
git commit -m "feat(pagos): gate de inicio sin pago + reintegro al cancelar"
```

---

## Task 10: Cron — expirar urgentes sin pagar + reintegrar held expirados

**Files:**
- Modify: `src/app/api/cron/expire-jobs/route.ts`

- [ ] **Step 1: Reescribir el handler del cron**

Reemplazar el contenido completo de `src/app/api/cron/expire-jobs/route.ts` por:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { refundJobPayment } from "@/lib/mercadopago/refund";

/**
 * Vercel Cron — expira pedidos urgentes vencidos:
 *  - en broadcast que nadie aceptó, y
 *  - aceptados que el cliente nunca pagó (paymentStatus none/pending).
 * Si un job expirado tenía el pago retenido (held), lo reintegra.
 * Protegido por CRON_SECRET. Schedule en vercel.json (cada 5 min).
 */
const TTL_MINUTES = 10;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expired = (await db.execute(
    sql`update jobs set status = 'expired', updated_at = now()
        where created_at < now() - interval '${sql.raw(String(TTL_MINUTES))} minutes'
          and (
            status = 'broadcasting'
            or (type = 'urgent' and status = 'accepted'
                and payment_status in ('none','pending'))
          )
        returning id, payment_status, mp_payment_id`,
  )) as unknown as {
    id: string;
    payment_status: string;
    mp_payment_id: string | null;
  }[];

  if (expired.length > 0) {
    await db.execute(
      sql`update job_dispatch set status = 'expired', responded_at = now()
          where status = 'notified'
            and job_id in (select id from jobs where status = 'expired')`,
    );

    // Reintegrar los que estaban pagados (held) pero nadie completó.
    for (const j of expired) {
      if (j.payment_status === "held" && j.mp_payment_id) {
        await refundJobPayment(j.mp_payment_id);
        await db
          .update(jobs)
          .set({ paymentStatus: "refunded", updatedAt: new Date() })
          .where(eq(jobs.id, j.id));
      }
    }
  }

  return NextResponse.json({ expired: expired.length });
}
```

- [ ] **Step 2: Verificar tipos**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/expire-jobs/route.ts
git commit -m "feat(pagos): cron expira urgentes sin pagar y reintegra held expirados"
```

---

## Task 11: `getJobDetail` expone `priceEstimate` y `mpPreferenceId`

**Files:**
- Modify: `src/lib/db/queries.ts:139-196`

- [ ] **Step 1: Agregar los campos al tipo `JobDetail`**

En el tipo `JobDetail` (líneas ~139-165), agregar después de `paymentMethod`:

```ts
  paymentMethod: PaymentMethod;
  priceEstimate: string | null;
  mpPreferenceId: string | null;
```

- [ ] **Step 2: Agregar los campos al `select` de `getJobDetail`**

En el `.select({...})` (líneas ~170-192), agregar después de `paymentMethod: jobs.paymentMethod,`:

```ts
      paymentMethod: jobs.paymentMethod,
      priceEstimate: jobs.priceEstimate,
      mpPreferenceId: jobs.mpPreferenceId,
```

- [ ] **Step 3: Verificar tipos**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/queries.ts
git commit -m "feat(pagos): getJobDetail expone priceEstimate y mpPreferenceId"
```

---

## Task 12: UI cliente — panel de pago (badge + CTA "Pagar" + toast)

**Files:**
- Create: `src/components/app/job-payment-panel.tsx`
- Modify: `src/app/(app)/pedido/[id]/page.tsx:1-45`

- [ ] **Step 1: Crear el componente `JobPaymentPanel`**

```tsx
"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CreditCard, ShieldCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PaymentMethod, PaymentStatus } from "@/types";

/**
 * Estado de pago del pedido para el cliente. Para pagos transfer/card:
 *  - 'pending'  → botón "Pagar" que reabre el Checkout (reconstruido del preferenceId).
 *  - 'held'     → "Pago retenido".
 *  - 'refunded' → "Reintegrado".
 * Muestra un toast según el back-url (?pago=success|failure|pending).
 */
export function JobPaymentPanel({
  paymentMethod,
  paymentStatus,
  mpPreferenceId,
}: {
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  mpPreferenceId: string | null;
}) {
  const params = useSearchParams();
  const pago = params.get("pago");

  useEffect(() => {
    if (pago === "success") toast.success("Recibimos tu pago. Queda retenido hasta completar el trabajo.");
    else if (pago === "failure") toast.error("El pago no se completó. Probá de nuevo.");
    else if (pago === "pending") toast.info("Tu pago está pendiente de acreditación.");
  }, [pago]);

  if (paymentMethod === "cash") {
    return (
      <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Pagás en efectivo, coordinás con el profesional.
      </p>
    );
  }

  if (paymentStatus === "held") {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 p-4 text-sm font-medium text-success">
        <ShieldCheck className="size-4" /> Pago retenido — protegido hasta completar el trabajo.
      </p>
    );
  }

  if (paymentStatus === "refunded") {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <RotateCcw className="size-4" /> Pago reintegrado.
      </p>
    );
  }

  if (paymentStatus === "pending" && mpPreferenceId) {
    const checkoutUrl = `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${mpPreferenceId}`;
    return (
      <Button asChild className="w-full">
        <a href={checkoutUrl}>
          <CreditCard className="size-4" /> Pagar con Mercado Pago
        </a>
      </Button>
    );
  }

  return null;
}
```

- [ ] **Step 2: Montar el panel en la página de detalle del cliente**

En `src/app/(app)/pedido/[id]/page.tsx`, importar y renderizar el panel arriba de `ClientJobActions`:

```tsx
import { JobPaymentPanel } from "@/components/app/job-payment-panel";
```

Dentro del `<JobDetailView>`, antes de `<ClientJobActions ... />`:

```tsx
      <JobPaymentPanel
        paymentMethod={job.paymentMethod}
        paymentStatus={job.paymentStatus}
        mpPreferenceId={job.mpPreferenceId}
      />

      <ClientJobActions jobId={job.id} status={job.status} />
```

- [ ] **Step 3: Verificar tipos, lint y build**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/app/job-payment-panel.tsx "src/app/(app)/pedido/[id]/page.tsx"
git commit -m "feat(pagos): panel de pago del cliente (badge + CTA Pagar + toast)"
```

---

## Task 13: Wizard — input de estimado + redirección a Checkout

**Files:**
- Modify: `src/components/app/new-order-wizard.tsx:58-96` y `:191-209`

- [ ] **Step 1: Agregar el estado del estimado**

En `new-order-wizard.tsx`, junto a `const [payment, setPayment] = useState<PaymentMethod>("cash");` (línea ~58), agregar:

```tsx
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [priceEstimate, setPriceEstimate] = useState("");
```

- [ ] **Step 2: Validar y pasar el estimado en `submit()` + manejar `redirectUrl`**

Reemplazar la función `submit()` (líneas ~71-96) por:

```tsx
  function submit() {
    if (type === "scheduled" && !scheduledAt) {
      return toast.error("Elegí fecha y hora.");
    }
    const estimate = Number(priceEstimate);
    if (payment !== "cash" && (!Number.isFinite(estimate) || estimate <= 0)) {
      return toast.error("Ingresá un precio estimado para pagar por la app.");
    }
    startTransition(async () => {
      const res = await createJob({
        categoryId,
        type,
        title,
        description: description || undefined,
        photos,
        addressText: address.addressText,
        lat: address.lat,
        lng: address.lng,
        scheduledAt: type === "scheduled" ? scheduledAt : undefined,
        paymentMethod: payment,
        priceEstimate: payment !== "cash" ? estimate : undefined,
        providerId: isBroadcast ? undefined : providerId,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.redirectUrl) {
        // Pago prepago: ir a Checkout Pro de Mercado Pago.
        window.location.href = res.redirectUrl;
        return;
      }
      toast.success("¡Pedido creado!");
      router.push(`/pedido/${res.jobId}`);
    });
  }
```

- [ ] **Step 3: Mostrar el input de estimado cuando el pago no es efectivo**

En el step 3, después del bloque `<div className="grid gap-2"> ... </div>` que contiene los `PaymentOption` (línea ~208, justo antes de cerrar el `<div className="space-y-2">` del pago), agregar:

```tsx
            {payment !== "cash" && (
              <div className="space-y-1.5 pt-2">
                <Label htmlFor="estimate">Precio estimado (ARS)</Label>
                <Input
                  id="estimate"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  placeholder="Ej: 15000"
                  value={priceEstimate}
                  onChange={(e) => setPriceEstimate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Lo pagás ahora y queda retenido hasta completar el trabajo.
                </p>
              </div>
            )}
```

- [ ] **Step 4: Actualizar el copy del `PaymentOption` de transfer**

Cambiar el `desc` del `PaymentOption` de "Transferencia / Tarjeta" (línea ~206) de
`"Por la app con Mercado Pago (Step 9)"` a `"Por la app con Mercado Pago"`.

- [ ] **Step 5: Verificar tipos, lint y build**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/app/new-order-wizard.tsx
git commit -m "feat(pagos): wizard con precio estimado y redirección a Checkout"
```

---

## Task 14: UI pro — gate "Iniciar" + banner "Esperando pago"

**Files:**
- Modify: `src/components/pro/provider-job-actions.tsx:13-87`
- Modify: `src/app/(pro)/pro/pedido/[id]/page.tsx:20-27`

- [ ] **Step 1: Pasar `paymentMethod`/`paymentStatus` desde la página del pro**

En `src/app/(pro)/pro/pedido/[id]/page.tsx`, cambiar el render de `ProviderJobActions`:

```tsx
      <ProviderJobActions
        jobId={job.id}
        status={job.status}
        paymentMethod={job.paymentMethod}
        paymentStatus={job.paymentStatus}
      />
```

- [ ] **Step 2: Agregar las props y el gate en `ProviderJobActions`**

En `src/components/pro/provider-job-actions.tsx`, ampliar la firma y la rama `accepted`. Cambiar el import de tipos:

```tsx
import type { JobStatus, PaymentMethod, PaymentStatus } from "@/types";
```

La firma del componente (líneas ~14-20):

```tsx
export function ProviderJobActions({
  jobId,
  status,
  paymentMethod,
  paymentStatus,
}: {
  jobId: string;
  status: JobStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
}) {
```

Reemplazar la rama `if (status === "accepted") { ... }` (líneas ~80-87) por:

```tsx
  if (status === "accepted") {
    const awaitingPayment = paymentMethod !== "cash" && paymentStatus !== "held";
    if (awaitingPayment) {
      return (
        <p className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-center text-sm font-medium text-warning">
          Esperando pago del cliente. Vas a poder iniciar cuando el pago esté confirmado.
        </p>
      );
    }
    return (
      <Button className="w-full" onClick={() => move("in_progress")} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
        Iniciar trabajo
      </Button>
    );
  }
```

- [ ] **Step 3: Verificar tipos, lint y build**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/pro/provider-job-actions.tsx "src/app/(pro)/pro/pedido/[id]/page.tsx"
git commit -m "feat(pagos): gate de Iniciar + banner Esperando pago en el lado pro"
```

---

## Task 15: Verificación final

**Files:** ninguno (sólo verificación)

- [ ] **Step 1: Suite completa sin DB de test (debe quedar verde)**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: PASS. Los tests de integración (`tests/integration/payments.test.ts`) se saltean sin `TEST_DATABASE_URL`.

- [ ] **Step 2: Suite con DB de test (corre la integración)**

Run: `TEST_DATABASE_URL=postgresql://localhost/altoque_test pnpm test`
Expected: PASS, incluyendo los 5 casos de `pagos MP (integración)`.

- [ ] **Step 3: Aplicar el índice nuevo en Supabase**

Correr en el SQL editor de Supabase el bloque agregado en la Task 1 a `drizzle/postgis.sql`
(o re-ejecutar `drizzle/postgis.sql` completo — es idempotente por los `if not exists` / `drop policy if exists`).

- [ ] **Step 4: Configurar env + webhook en Supabase/MP/Vercel (checklist manual)**

- `.env.local` / Vercel: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL` definidos.
- En MP (Tus Integraciones → Webhooks): URL `${NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`, evento **Pagos**, copiar la *clave secreta* a `MP_WEBHOOK_SECRET`.
- Probar un pago de sandbox de punta a punta: crear pedido transfer → Checkout → aprobar → verificar `paymentStatus='held'` en el job.

---

## Notas de cierre

- **No-negociables cubiertos:** #2 (firma + idempotencia del webhook — Tasks 5/6/8), #1 (TS strict, sin `any`), #5 (env de MP guardada al usarse, sin secretos commiteados). #4 (comisión en un solo lugar) **no se invoca** en 9a porque no hay liquidación todavía; queda intacta para 9b.
- **Fuera de alcance (→ 9b):** `completeJob` (release / refund-down / upcharge), escritura en `commission_ledger`, captura del destino de payout del profesional, vista de payout del admin.
- **Riesgo asumido (decisión del usuario):** urgentes "broadcast inmediato + pago en paralelo". Mitigado por el gate de `in_progress` (Task 9) y la expiración de urgentes sin pagar (Task 10).
