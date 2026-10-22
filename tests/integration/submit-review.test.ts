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
 * Tests de integración de `submitReview` (reseña bidireccional, Step 10):
 * solo trabajos completados, solo las partes, el target forzado a la
 * contraparte, el set de aspectos exacto por dirección, única por job+autor,
 * y recálculo del rating agregado del reseñado (provider_profiles o profiles).
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

const CLIENT = "11111111-1111-1111-1111-111111111111";
const CLIENT2 = "22222222-2222-2222-2222-222222222222";
const PROVIDER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const CATEGORY = "cccccccc-cccc-cccc-cccc-cccccccccccc";

// cliente → profesional: promedio (5+4+5+4)/4 = 4.5
const PROVIDER_ASPECTS = {
  punctuality: 5,
  quality: 4,
  communication: 5,
  price: 4,
};
// profesional → cliente: promedio (5+5+4+5)/4 = 4.75 → 4.8
const CLIENT_ASPECTS = {
  respect: 5,
  availability: 5,
  clarity: 4,
  payment: 5,
};

describe.skipIf(!hasTestDb)("submitReview (integración)", () => {
  let sql: RawClient;
  let submitReview: typeof import("@/lib/actions/review").submitReview;

  beforeAll(async () => {
    sql = rawClient();
    await setupTestSchema(sql);
    ({ submitReview } = await import("@/lib/actions/review"));
  });

  afterAll(async () => {
    await sql.end();
  });

  beforeEach(async () => {
    await truncateAll(sql);
    currentSession = null;
  });

  async function seedCompletedJob(
    clientId: string,
    providerId: string,
  ): Promise<string> {
    await sql`insert into provider_profiles (profile_id) values (${providerId})
              on conflict (profile_id) do nothing`;
    await sql`insert into profiles (id) values (${clientId})
              on conflict (id) do nothing`;
    const [job] = await sql<{ id: string }[]>`
      insert into jobs
        (client_id, provider_id, category_id, type, status, title, payment_method)
      values
        (${clientId}, ${providerId}, ${CATEGORY}, 'scheduled', 'completed', 'Pintura de living', 'cash')
      returning id`;
    return job!.id;
  }

  it("el cliente reseña al profesional: crea reseña + aspectos y recalcula rating_avg", async () => {
    const jobId = await seedCompletedJob(CLIENT, PROVIDER);
    currentSession = { user: { id: CLIENT }, role: "client" };

    const res = await submitReview({
      jobId,
      targetId: PROVIDER,
      aspects: PROVIDER_ASPECTS,
      comment: "Excelente trabajo",
    });
    expect(res.ok).toBe(true);

    const [rev] = await sql<{ rating: string }[]>`
      select rating from reviews where job_id = ${jobId} and author_id = ${CLIENT}`;
    expect(Number(rev!.rating)).toBe(4.5);

    const aspects = await sql`select aspect, score from review_aspects`;
    expect(aspects).toHaveLength(4);

    const [prof] = await sql<{ rating_avg: string }[]>`
      select rating_avg from provider_profiles where profile_id = ${PROVIDER}`;
    expect(Number(prof!.rating_avg)).toBe(4.5);
  });

  it("el profesional reseña al cliente: actualiza rating_avg y rating_count del cliente", async () => {
    const jobId = await seedCompletedJob(CLIENT, PROVIDER);
    currentSession = { user: { id: PROVIDER }, role: "provider" };

    const res = await submitReview({
      jobId,
      targetId: CLIENT,
      aspects: CLIENT_ASPECTS,
    });
    expect(res.ok).toBe(true);

    const [prof] = await sql<{ rating_avg: string; rating_count: number }[]>`
      select rating_avg, rating_count from profiles where id = ${CLIENT}`;
    expect(Number(prof!.rating_avg)).toBe(4.8);
    expect(prof!.rating_count).toBe(1);
  });

  it("rechaza reseñar un trabajo no completado", async () => {
    const jobId = await seedCompletedJob(CLIENT, PROVIDER);
    await sql`update jobs set status = 'in_progress' where id = ${jobId}`;
    currentSession = { user: { id: CLIENT }, role: "client" };

    const res = await submitReview({
      jobId,
      targetId: PROVIDER,
      aspects: PROVIDER_ASPECTS,
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza si el target no es la contraparte", async () => {
    const jobId = await seedCompletedJob(CLIENT, PROVIDER);
    currentSession = { user: { id: CLIENT }, role: "client" };

    // el cliente intenta reseñarse a sí mismo
    const res = await submitReview({
      jobId,
      targetId: CLIENT,
      aspects: PROVIDER_ASPECTS,
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza el set de aspectos de la dirección equivocada", async () => {
    const jobId = await seedCompletedJob(CLIENT, PROVIDER);
    currentSession = { user: { id: CLIENT }, role: "client" };

    // cliente→pro pero manda los aspectos de pro→cliente
    const res = await submitReview({
      jobId,
      targetId: PROVIDER,
      aspects: CLIENT_ASPECTS,
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza una segunda reseña del mismo autor para el mismo trabajo", async () => {
    const jobId = await seedCompletedJob(CLIENT, PROVIDER);
    currentSession = { user: { id: CLIENT }, role: "client" };

    const first = await submitReview({
      jobId,
      targetId: PROVIDER,
      aspects: PROVIDER_ASPECTS,
    });
    expect(first.ok).toBe(true);

    const second = await submitReview({
      jobId,
      targetId: PROVIDER,
      aspects: PROVIDER_ASPECTS,
    });
    expect(second.ok).toBe(false);
  });

  it("promedia el rating del profesional sobre varias reseñas", async () => {
    const job1 = await seedCompletedJob(CLIENT, PROVIDER);
    const job2 = await seedCompletedJob(CLIENT2, PROVIDER);

    currentSession = { user: { id: CLIENT }, role: "client" };
    await submitReview({
      jobId: job1,
      targetId: PROVIDER,
      aspects: { punctuality: 5, quality: 4, communication: 5, price: 4 }, // 4.5
    });

    currentSession = { user: { id: CLIENT2 }, role: "client" };
    await submitReview({
      jobId: job2,
      targetId: PROVIDER,
      aspects: { punctuality: 3, quality: 3, communication: 3, price: 3 }, // 3.0
    });

    const [prof] = await sql<{ rating_avg: string }[]>`
      select rating_avg from provider_profiles where profile_id = ${PROVIDER}`;
    // (4.5 + 3.0) / 2 = 3.75 → 3.8
    expect(Number(prof!.rating_avg)).toBe(3.8);
  });
});
