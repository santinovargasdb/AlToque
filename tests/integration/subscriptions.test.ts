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

/**
 * Tests de integración del modelo de suscripción (spec 2026-07-31, §11.8):
 *  - Gate del profesional: sin `subscription_active` NO puede tomar pedidos
 *    nuevos — ni `acceptJob` (urgente) ni `updateJobStatus`→`accepted`
 *    (agendado); con el flag activo, sí.
 *  - Idempotencia del webhook: `processPreapprovalEvent` mapea el estado de MP,
 *    sincroniza `provider_profiles.subscription_active` y es seguro repetirlo.
 *
 * Ejercitan los Server Actions REALES contra una DB de test. Requieren
 * `TEST_DATABASE_URL`; si no está, el bloque se salta (`describe.skipIf`).
 */

type Session = {
  user: { id: string };
  role: "client" | "provider" | "admin";
} | null;

let currentSession: Session = null;

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(async () => currentSession),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/maps/geocode", () => ({
  geocodeAddress: vi.fn(async () => null),
}));
vi.mock("@/lib/notifications/dispatch", () => ({
  dispatchNewUrgentJob: vi.fn(async () => {}),
}));
vi.mock("@/lib/db/queries", () => ({ findNearbyProviders: vi.fn() }));
vi.mock("@/lib/push/send", () => ({ sendPushToUsers: vi.fn(async () => {}) }));
vi.mock("@/lib/mercadopago/subscriptions", () => ({
  createPreApproval: vi.fn(),
  fetchPreApprovalStatus: vi.fn(),
}));

const CLIENT = "11111111-1111-1111-1111-111111111111";
const PROVIDER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const CATEGORY = "cccccccc-cccc-cccc-cccc-cccccccccccc";

describe.skipIf(!hasTestDb)("modelo de suscripción (integración)", () => {
  let sql: RawClient;
  let acceptJob: typeof import("@/lib/actions/dispatch").acceptJob;
  let updateJobStatus: typeof import("@/lib/actions/job").updateJobStatus;
  let processPreapprovalEvent: typeof import("@/lib/actions/subscription").processPreapprovalEvent;

  beforeAll(async () => {
    sql = rawClient();
    await setupTestSchema(sql);
    // Import dinámico: solo cuando hay DB (evita cargar @/lib/db sin env).
    ({ acceptJob } = await import("@/lib/actions/dispatch"));
    ({ updateJobStatus } = await import("@/lib/actions/job"));
    ({ processPreapprovalEvent } = await import("@/lib/actions/subscription"));
  });

  afterAll(async () => {
    await sql.end();
  });

  beforeEach(async () => {
    await truncateAll(sql);
    currentSession = null;
  });

  async function setProviderSub(providerId: string, active: boolean) {
    await sql`insert into provider_profiles (profile_id, subscription_active)
              values (${providerId}, ${active})
              on conflict (profile_id) do update set subscription_active = ${active}`;
  }

  async function seedBroadcastJob(providerId: string): Promise<string> {
    const [job] = await sql<{ id: string }[]>`
      insert into jobs (client_id, category_id, type, status, title, payment_method)
      values (${CLIENT}, ${CATEGORY}, 'urgent', 'broadcasting', 'Cerradura trabada', 'cash')
      returning id`;
    await sql`insert into job_dispatch (job_id, provider_id, status, distance_km)
              values (${job!.id}, ${providerId}, 'notified', '1.2')`;
    return job!.id;
  }

  async function seedRequestedJob(providerId: string): Promise<string> {
    const [job] = await sql<{ id: string }[]>`
      insert into jobs
        (client_id, provider_id, category_id, type, status, title, payment_method)
      values
        (${CLIENT}, ${providerId}, ${CATEGORY}, 'scheduled', 'requested', 'Instalación de grifería', 'cash')
      returning id`;
    return job!.id;
  }

  // ── Gate: acceptJob (urgente) ──
  it("acceptJob rechaza al profesional sin suscripción activa", async () => {
    const jobId = await seedBroadcastJob(PROVIDER_A);
    await setProviderSub(PROVIDER_A, false);
    currentSession = { user: { id: PROVIDER_A }, role: "provider" };

    const res = await acceptJob(jobId);
    expect(res.ok).toBe(false);

    const [job] = await sql<{ status: string }[]>`
      select status from jobs where id = ${jobId}`;
    expect(job!.status).toBe("broadcasting");
  });

  it("acceptJob acepta al profesional con suscripción activa", async () => {
    const jobId = await seedBroadcastJob(PROVIDER_A);
    await setProviderSub(PROVIDER_A, true);
    currentSession = { user: { id: PROVIDER_A }, role: "provider" };

    const res = await acceptJob(jobId);
    expect(res.ok).toBe(true);

    const [job] = await sql<{ status: string; provider_id: string }[]>`
      select status, provider_id from jobs where id = ${jobId}`;
    expect(job!.status).toBe("accepted");
    expect(job!.provider_id).toBe(PROVIDER_A);
  });

  // ── Gate: updateJobStatus → accepted (agendado) ──
  it("updateJobStatus(accepted) rechaza sin suscripción activa", async () => {
    const jobId = await seedRequestedJob(PROVIDER_A);
    await setProviderSub(PROVIDER_A, false);
    currentSession = { user: { id: PROVIDER_A }, role: "provider" };

    const res = await updateJobStatus({ jobId, status: "accepted" });
    expect(res.ok).toBe(false);

    const [job] = await sql<{ status: string }[]>`
      select status from jobs where id = ${jobId}`;
    expect(job!.status).toBe("requested");
  });

  it("updateJobStatus(accepted) acepta con suscripción activa", async () => {
    const jobId = await seedRequestedJob(PROVIDER_A);
    await setProviderSub(PROVIDER_A, true);
    currentSession = { user: { id: PROVIDER_A }, role: "provider" };

    const res = await updateJobStatus({ jobId, status: "accepted" });
    expect(res.ok).toBe(true);

    const [job] = await sql<{ status: string }[]>`
      select status from jobs where id = ${jobId}`;
    expect(job!.status).toBe("accepted");
  });

  it("una transición sobre un trabajo YA aceptado no se gatea (iniciar)", async () => {
    // Trabajo ya aceptado: el profesional puede iniciarlo aunque pierda el plan.
    const jobId = await seedRequestedJob(PROVIDER_A);
    await sql`update jobs set status = 'accepted' where id = ${jobId}`;
    await setProviderSub(PROVIDER_A, false);
    currentSession = { user: { id: PROVIDER_A }, role: "provider" };

    const res = await updateJobStatus({ jobId, status: "in_progress" });
    expect(res.ok).toBe(true);

    const [job] = await sql<{ status: string }[]>`
      select status from jobs where id = ${jobId}`;
    expect(job!.status).toBe("in_progress");
  });

  // ── Webhook: idempotencia + sync del flag ──
  it("processPreapprovalEvent mapea estado, sincroniza el flag y es idempotente", async () => {
    await setProviderSub(PROVIDER_A, false);
    await sql`insert into subscriptions (profile_id, plan, status, mp_preapproval_id)
              values (${PROVIDER_A}, 'provider_monthly', 'pending', 'pre_1')`;

    await processPreapprovalEvent("pre_1", "authorized");
    let [sub] = await sql<{ status: string }[]>`
      select status from subscriptions where mp_preapproval_id = 'pre_1'`;
    let [prof] = await sql<{ subscription_active: boolean }[]>`
      select subscription_active from provider_profiles where profile_id = ${PROVIDER_A}`;
    expect(sub!.status).toBe("active");
    expect(prof!.subscription_active).toBe(true);

    // Repetir el mismo evento no cambia nada (idempotente).
    await processPreapprovalEvent("pre_1", "authorized");
    [sub] = await sql<{ status: string }[]>`
      select status from subscriptions where mp_preapproval_id = 'pre_1'`;
    expect(sub!.status).toBe("active");

    // Cancelación corta el gate.
    await processPreapprovalEvent("pre_1", "cancelled");
    [sub] = await sql<{ status: string }[]>`
      select status from subscriptions where mp_preapproval_id = 'pre_1'`;
    [prof] = await sql<{ subscription_active: boolean }[]>`
      select subscription_active from provider_profiles where profile_id = ${PROVIDER_A}`;
    expect(sub!.status).toBe("cancelled");
    expect(prof!.subscription_active).toBe(false);
  });

  it("processPreapprovalEvent con un preapproval desconocido no lanza", async () => {
    await expect(
      processPreapprovalEvent("desconocido", "authorized"),
    ).resolves.toBeUndefined();
  });
});
