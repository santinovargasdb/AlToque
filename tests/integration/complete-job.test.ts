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
 * Tests de integración de `completeJob` (Step 6): el profesional carga el
 * precio final y el trabajo pasa a `completed`, incrementando `jobs_completed`.
 * `finalPrice` es un dato de negocio (la plataforma no cobra el servicio).
 *
 * Requieren `TEST_DATABASE_URL`; si no está, el bloque se salta.
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

const CLIENT = "11111111-1111-1111-1111-111111111111";
const PROVIDER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PROVIDER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const CATEGORY = "cccccccc-cccc-cccc-cccc-cccccccccccc";

describe.skipIf(!hasTestDb)("completeJob (integración)", () => {
  let sql: RawClient;
  let completeJob: typeof import("@/lib/actions/job").completeJob;

  beforeAll(async () => {
    sql = rawClient();
    await setupTestSchema(sql);
    ({ completeJob } = await import("@/lib/actions/job"));
  });

  afterAll(async () => {
    await sql.end();
  });

  beforeEach(async () => {
    await truncateAll(sql);
    currentSession = null;
  });

  async function seedInProgressJob(providerId: string): Promise<string> {
    await sql`insert into provider_profiles (profile_id, jobs_completed)
              values (${providerId}, 0)
              on conflict (profile_id) do update set jobs_completed = 0`;
    const [job] = await sql<{ id: string }[]>`
      insert into jobs
        (client_id, provider_id, category_id, type, status, title, payment_method)
      values
        (${CLIENT}, ${providerId}, ${CATEGORY}, 'scheduled', 'in_progress', 'Arreglo de caño', 'cash')
      returning id`;
    return job!.id;
  }

  it("completa el trabajo: precio final, status completed y jobs_completed++", async () => {
    const jobId = await seedInProgressJob(PROVIDER_A);
    currentSession = { user: { id: PROVIDER_A }, role: "provider" };

    const res = await completeJob({ jobId, finalPrice: 15000 });
    expect(res.ok).toBe(true);

    const [job] = await sql<
      { status: string; final_price: string; completed_at: Date | null }[]
    >`select status, final_price, completed_at from jobs where id = ${jobId}`;
    expect(job!.status).toBe("completed");
    expect(Number(job!.final_price)).toBe(15000);
    expect(job!.completed_at).not.toBeNull();

    const [prof] = await sql<{ jobs_completed: number }[]>`
      select jobs_completed from provider_profiles where profile_id = ${PROVIDER_A}`;
    expect(prof!.jobs_completed).toBe(1);
  });

  it("rechaza si el pedido no está en curso", async () => {
    const jobId = await seedInProgressJob(PROVIDER_A);
    await sql`update jobs set status = 'accepted' where id = ${jobId}`;
    currentSession = { user: { id: PROVIDER_A }, role: "provider" };

    const res = await completeJob({ jobId, finalPrice: 15000 });
    expect(res.ok).toBe(false);

    const [job] = await sql<{ status: string }[]>`
      select status from jobs where id = ${jobId}`;
    expect(job!.status).toBe("accepted");
  });

  it("rechaza si lo intenta un profesional que no es el asignado", async () => {
    const jobId = await seedInProgressJob(PROVIDER_A);
    currentSession = { user: { id: PROVIDER_B }, role: "provider" };

    const res = await completeJob({ jobId, finalPrice: 15000 });
    expect(res.ok).toBe(false);

    const [job] = await sql<{ status: string }[]>`
      select status from jobs where id = ${jobId}`;
    expect(job!.status).toBe("in_progress");
  });

  it("valida el precio final (rechaza no positivo)", async () => {
    const jobId = await seedInProgressJob(PROVIDER_A);
    currentSession = { user: { id: PROVIDER_A }, role: "provider" };

    const res = await completeJob({ jobId, finalPrice: 0 });
    expect(res.ok).toBe(false);
  });
});
