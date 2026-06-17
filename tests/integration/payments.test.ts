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
});
