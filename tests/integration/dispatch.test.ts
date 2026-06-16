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
 * Tests de integración del despacho urgente (Step 7, Sección 13 del blueprint):
 *  - `acceptJob` es race-safe: con dos providers concurrentes, gana exactamente
 *    uno (garantía a nivel DB: `UPDATE ... WHERE status='broadcasting'`).
 *  - `createJob` urgente puebla `job_dispatch` y deja el pedido en broadcasting.
 *
 * Ejercitan los Server Actions REALES contra una DB de test. Requieren
 * `TEST_DATABASE_URL`; si no está, el bloque se salta (`describe.skipIf`).
 *   Ejecutar:  TEST_DATABASE_URL=postgres://... pnpm test
 */

type Session = {
  user: { id: string };
  role: "client" | "provider" | "admin";
  profile?: unknown;
} | null;

// Cola de sesiones: getSession() saca de la cola en orden de invocación
// (JS es single-thread → la asignación es determinista). Si la cola está
// vacía, devuelve `currentSession`.
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
const findNearbyProviders = vi.fn();
vi.mock("@/lib/db/queries", () => ({ findNearbyProviders }));

const CLIENT = "11111111-1111-1111-1111-111111111111";
const PROVIDER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PROVIDER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const CATEGORY = "cccccccc-cccc-cccc-cccc-cccccccccccc";

describe.skipIf(!hasTestDb)("despacho urgente (integración)", () => {
  let sql: RawClient;
  let acceptJob: typeof import("@/lib/actions/dispatch").acceptJob;
  let declineJob: typeof import("@/lib/actions/dispatch").declineJob;
  let createJob: typeof import("@/lib/actions/job").createJob;

  beforeAll(async () => {
    sql = rawClient();
    await setupTestSchema(sql);
    // Import dinámico: solo cuando hay DB (evita cargar @/lib/db sin env).
    ({ acceptJob, declineJob } = await import("@/lib/actions/dispatch"));
    ({ createJob } = await import("@/lib/actions/job"));
  });

  afterAll(async () => {
    await sql.end();
  });

  beforeEach(async () => {
    await truncateAll(sql);
    sessionQueue.length = 0;
    currentSession = null;
    findNearbyProviders.mockReset();
  });

  /** Inserta un pedido en `broadcasting` con dispatch notificado a A y B. */
  async function seedBroadcastJob(): Promise<string> {
    const [job] = await sql<{ id: string }[]>`
      insert into jobs
        (client_id, category_id, type, status, title, payment_method, commission_rate)
      values
        (${CLIENT}, ${CATEGORY}, 'urgent', 'broadcasting', 'Cerradura trabada', 'cash', '0.120')
      returning id`;
    await sql`
      insert into job_dispatch (job_id, provider_id, status, distance_km) values
        (${job!.id}, ${PROVIDER_A}, 'notified', '1.2'),
        (${job!.id}, ${PROVIDER_B}, 'notified', '2.5')`;
    return job!.id;
  }

  it("acceptJob es race-safe: con dos providers concurrentes gana exactamente uno", async () => {
    const jobId = await seedBroadcastJob();
    sessionQueue.push(
      { user: { id: PROVIDER_A }, role: "provider" },
      { user: { id: PROVIDER_B }, role: "provider" },
    );

    const [r1, r2] = await Promise.all([acceptJob(jobId), acceptJob(jobId)]);

    expect([r1, r2].filter((r) => r.ok)).toHaveLength(1);
    expect([r1, r2].filter((r) => !r.ok)).toHaveLength(1);

    const [job] = await sql<{ status: string; provider_id: string }[]>`
      select status, provider_id from jobs where id = ${jobId}`;
    expect(job!.status).toBe("accepted");
    expect([PROVIDER_A, PROVIDER_B]).toContain(job!.provider_id);

    // El dispatch del ganador queda 'accepted'; el del perdedor 'expired'.
    const rows = await sql<{ provider_id: string; status: string }[]>`
      select provider_id, status from job_dispatch where job_id = ${jobId}`;
    const winner = rows.find((r) => r.provider_id === job!.provider_id);
    const loser = rows.find((r) => r.provider_id !== job!.provider_id);
    expect(winner?.status).toBe("accepted");
    expect(loser?.status).toBe("expired");
  });

  it("acceptJob sobre un pedido ya tomado devuelve error", async () => {
    const jobId = await seedBroadcastJob();
    await sql`update jobs set status = 'accepted', provider_id = ${PROVIDER_A}
              where id = ${jobId}`;
    currentSession = { user: { id: PROVIDER_B }, role: "provider" };

    const res = await acceptJob(jobId);
    expect(res.ok).toBe(false);
  });

  it("declineJob marca solo el dispatch del provider, sin tocar a los demás", async () => {
    const jobId = await seedBroadcastJob();
    currentSession = { user: { id: PROVIDER_A }, role: "provider" };

    const res = await declineJob(jobId);
    expect(res.ok).toBe(true);

    const rows = await sql<{ provider_id: string; status: string }[]>`
      select provider_id, status from job_dispatch where job_id = ${jobId}`;
    expect(rows.find((r) => r.provider_id === PROVIDER_A)?.status).toBe(
      "declined",
    );
    expect(rows.find((r) => r.provider_id === PROVIDER_B)?.status).toBe(
      "notified",
    );
  });

  it("createJob urgente puebla job_dispatch y deja el pedido en broadcasting", async () => {
    currentSession = { user: { id: CLIENT }, role: "client" };
    findNearbyProviders.mockResolvedValue([
      { provider_id: PROVIDER_A, distance_km: 1.2, rating_avg: "4.8" },
      { provider_id: PROVIDER_B, distance_km: 2.5, rating_avg: "4.5" },
    ]);

    const res = await createJob({
      categoryId: CATEGORY,
      type: "urgent",
      title: "Pérdida de agua",
      addressText: "Av. Siempreviva 742",
      lat: -34.6,
      lng: -58.4,
      paymentMethod: "cash",
      photos: [],
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const [job] = await sql<{ status: string; type: string }[]>`
      select status, type from jobs where id = ${res.jobId}`;
    expect(job!.status).toBe("broadcasting");
    expect(job!.type).toBe("urgent");

    const rows = await sql<{ provider_id: string; status: string }[]>`
      select provider_id, status from job_dispatch where job_id = ${res.jobId}`;
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.status === "notified")).toBe(true);
    expect(rows.map((r) => r.provider_id).sort()).toEqual(
      [PROVIDER_A, PROVIDER_B].sort(),
    );
  });
});
