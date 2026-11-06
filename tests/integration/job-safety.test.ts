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
 * Tests de integración de las garantías del ciclo del pedido:
 *  - Vencimiento de urgencias: pasado el TTL no se listan, no se aceptan y
 *    `expireStaleUrgentJobs` las cierra.
 *  - `cancelBroadcastJob` no toca el despacho de un pedido ajeno.
 *  - Las transiciones son race-safe: con dos acciones concurrentes gana una.
 *  - Un profesional sin verificar no recibe ni toma pedidos.
 *
 * Requieren `TEST_DATABASE_URL`; si no está, el bloque se salta.
 */

type Session = {
  user: { id: string };
  role: "client" | "provider" | "admin";
} | null;

const sessionQueue: Session[] = [];
let currentSession: Session = null;

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(async () =>
    sessionQueue.length ? sessionQueue.shift()! : currentSession,
  ),
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

const CLIENT = "11111111-1111-1111-1111-111111111111";
const OTHER_CLIENT = "22222222-2222-2222-2222-222222222222";
const PROVIDER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const CATEGORY = "cccccccc-cccc-cccc-cccc-cccccccccccc";

describe.skipIf(!hasTestDb)("garantías del pedido (integración)", () => {
  let sql: RawClient;
  let dispatch: typeof import("@/lib/actions/dispatch");
  let job: typeof import("@/lib/actions/job");
  let expireStaleUrgentJobs: typeof import("@/lib/jobs/expire").expireStaleUrgentJobs;

  beforeAll(async () => {
    sql = rawClient();
    await setupTestSchema(sql);
    dispatch = await import("@/lib/actions/dispatch");
    job = await import("@/lib/actions/job");
    ({ expireStaleUrgentJobs } = await import("@/lib/jobs/expire"));
  });

  afterAll(async () => {
    await sql.end();
  });

  beforeEach(async () => {
    await truncateAll(sql);
    sessionQueue.length = 0;
    currentSession = null;
    await sql`insert into provider_profiles (profile_id, subscription_active)
              values (${PROVIDER_A}, true)`;
    await sql`insert into categories (id, name) values (${CATEGORY}, 'Cerrajería')`;
  });

  async function seedBroadcast(minutesAgo = 0, clientId = CLIENT) {
    const [row] = await sql<{ id: string }[]>`
      insert into jobs
        (client_id, category_id, type, status, title, payment_method, created_at)
      values
        (${clientId}, ${CATEGORY}, 'urgent', 'broadcasting', 'Cerradura', 'cash',
         now() - make_interval(mins => ${minutesAgo}::int))
      returning id`;
    await sql`insert into job_dispatch (job_id, provider_id, status, distance_km)
              values (${row!.id}, ${PROVIDER_A}, 'notified', '1.2')`;
    return row!.id;
  }

  async function seedAssigned(status: "requested" | "accepted" | "in_progress") {
    const [row] = await sql<{ id: string }[]>`
      insert into jobs
        (client_id, provider_id, category_id, type, status, title, payment_method)
      values
        (${CLIENT}, ${PROVIDER_A}, ${CATEGORY}, 'scheduled', ${status}, 'Grifería', 'cash')
      returning id`;
    return row!.id;
  }

  async function jobStatus(id: string) {
    const [row] = await sql<{ status: string }[]>`
      select status from jobs where id = ${id}`;
    return row!.status;
  }

  async function dispatchStatus(id: string) {
    const [row] = await sql<{ status: string }[]>`
      select status from job_dispatch where job_id = ${id}`;
    return row!.status;
  }

  // ── Vencimiento de urgencias ──
  it("acceptJob rechaza una urgencia vencida aunque siga en broadcasting", async () => {
    const id = await seedBroadcast(11);
    currentSession = { user: { id: PROVIDER_A }, role: "provider" };

    const res = await dispatch.acceptJob(id);

    expect(res.ok).toBe(false);
    expect(await jobStatus(id)).toBe("broadcasting");
  });

  it("acceptJob acepta una urgencia dentro del plazo", async () => {
    const id = await seedBroadcast(9);
    currentSession = { user: { id: PROVIDER_A }, role: "provider" };

    expect((await dispatch.acceptJob(id)).ok).toBe(true);
    expect(await jobStatus(id)).toBe("accepted");
  });

  it("getIncomingJobs no lista urgencias vencidas", async () => {
    const fresh = await seedBroadcast(1);
    await seedBroadcast(11);
    currentSession = { user: { id: PROVIDER_A }, role: "provider" };

    const list = await dispatch.getIncomingJobs();

    expect(list.map((j) => j.id)).toEqual([fresh]);
  });

  it("expireStaleUrgentJobs cierra solo las vencidas y su despacho", async () => {
    const stale = await seedBroadcast(11);
    const fresh = await seedBroadcast(1);

    expect(await expireStaleUrgentJobs()).toBe(1);

    expect(await jobStatus(stale)).toBe("expired");
    expect(await dispatchStatus(stale)).toBe("expired");
    expect(await jobStatus(fresh)).toBe("broadcasting");
    expect(await dispatchStatus(fresh)).toBe("notified");
  });

  it("expireStaleUrgentJobs con cliente no toca los pedidos de otros", async () => {
    const mine = await seedBroadcast(11, CLIENT);
    const other = await seedBroadcast(11, OTHER_CLIENT);

    expect(await expireStaleUrgentJobs(CLIENT)).toBe(1);

    expect(await jobStatus(mine)).toBe("expired");
    expect(await jobStatus(other)).toBe("broadcasting");
  });

  // ── Autorización ──
  it("cancelBroadcastJob ajeno no cancela el pedido ni vence su despacho", async () => {
    const id = await seedBroadcast();
    currentSession = { user: { id: OTHER_CLIENT }, role: "client" };

    await dispatch.cancelBroadcastJob(id);

    expect(await jobStatus(id)).toBe("broadcasting");
    expect(await dispatchStatus(id)).toBe("notified");
  });

  it("cancelBroadcastJob propio cancela el pedido y vence su despacho", async () => {
    const id = await seedBroadcast();
    currentSession = { user: { id: CLIENT }, role: "client" };

    await dispatch.cancelBroadcastJob(id);

    expect(await jobStatus(id)).toBe("cancelled");
    expect(await dispatchStatus(id)).toBe("expired");
  });

  // ── Transiciones race-safe ──
  it("iniciar dos veces a la vez: gana exactamente una transición", async () => {
    const id = await seedAssigned("accepted");
    currentSession = { user: { id: PROVIDER_A }, role: "provider" };

    const results = await Promise.all([
      job.updateJobStatus({ jobId: id, status: "in_progress" }),
      job.updateJobStatus({ jobId: id, status: "in_progress" }),
    ]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("completeJob enviado dos veces suma un solo trabajo", async () => {
    const id = await seedAssigned("in_progress");
    currentSession = { user: { id: PROVIDER_A }, role: "provider" };

    const results = await Promise.all([
      job.completeJob({ jobId: id, finalPrice: 1000 }),
      job.completeJob({ jobId: id, finalPrice: 1000 }),
    ]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const [pp] = await sql<{ jobs_completed: number }[]>`
      select jobs_completed from provider_profiles where profile_id = ${PROVIDER_A}`;
    expect(pp!.jobs_completed).toBe(1);
  });

  // ── Solo profesionales aprobados ──
  const directJob = {
    categoryId: CATEGORY,
    type: "scheduled",
    title: "Instalar grifería",
    addressText: "Av. Corrientes 1234",
    lat: -34.6,
    lng: -58.4,
    paymentMethod: "cash",
    photos: [],
    providerId: PROVIDER_A,
    scheduledAt: new Date(Date.now() + 86_400_000),
  };

  it("createJob rechaza pedir a un profesional sin aprobar", async () => {
    await sql`update provider_profiles set verification_status = 'pending'
              where profile_id = ${PROVIDER_A}`;
    currentSession = { user: { id: CLIENT }, role: "client" };

    const res = await job.createJob(directJob);

    expect(res.ok).toBe(false);
    const rows = await sql`select id from jobs`;
    expect(rows).toHaveLength(0);
  });

  it("createJob acepta pedir a un profesional aprobado", async () => {
    currentSession = { user: { id: CLIENT }, role: "client" };

    const res = await job.createJob(directJob);

    expect(res).toMatchObject({ ok: true });
  });

  it("un profesional sin aprobar no puede tomar pedidos", async () => {
    const urgent = await seedBroadcast();
    const scheduled = await seedAssigned("requested");
    await sql`update provider_profiles set verification_status = 'pending'
              where profile_id = ${PROVIDER_A}`;
    currentSession = { user: { id: PROVIDER_A }, role: "provider" };

    expect((await dispatch.acceptJob(urgent)).ok).toBe(false);
    expect(
      (await job.updateJobStatus({ jobId: scheduled, status: "accepted" })).ok,
    ).toBe(false);
  });
});
