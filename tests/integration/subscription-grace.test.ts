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
 * Tests de integración del período de gracia de suscripción (spec §6), contra
 * Postgres real. Cubre la lógica de negocio (no la llamada a MP, que está
 * aislada en fetchAuthorizedPaymentStatus y se verifica en el sandbox):
 *  - processAuthorizedPaymentApproved: renueva el período + reactiva, idempotente.
 *  - expireGracePeriods: active vencido → past_due (gate abierto); past_due
 *    pasada la gracia → cancelled (gate cerrado); dentro de la gracia no corta.
 *
 * Requieren `TEST_DATABASE_URL`; si no está, el bloque se salta.
 */

vi.mock("@/lib/auth", () => ({ getSession: vi.fn(async () => null) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const PROVIDER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

describe.skipIf(!hasTestDb)("gracia de suscripción (integración)", () => {
  let sql: RawClient;
  let processAuthorizedPaymentApproved: typeof import("@/lib/actions/subscription").processAuthorizedPaymentApproved;
  let expireGracePeriods: typeof import("@/lib/actions/subscription").expireGracePeriods;
  let getProviderGateState: typeof import("@/lib/subscriptions/status").getProviderGateState;

  beforeAll(async () => {
    sql = rawClient();
    await setupTestSchema(sql);
    ({ processAuthorizedPaymentApproved, expireGracePeriods } = await import(
      "@/lib/actions/subscription"
    ));
    ({ getProviderGateState } = await import("@/lib/subscriptions/status"));
  });

  afterAll(async () => {
    await sql.end();
  });

  beforeEach(async () => {
    await truncateAll(sql);
  });

  async function setProvider(active: boolean) {
    await sql`insert into provider_profiles (profile_id, subscription_active)
              values (${PROVIDER}, ${active})
              on conflict (profile_id) do update set subscription_active = ${active}`;
  }

  async function providerActive(): Promise<boolean> {
    const [p] = await sql<{ subscription_active: boolean }[]>`
      select subscription_active from provider_profiles where profile_id = ${PROVIDER}`;
    return p!.subscription_active;
  }

  async function subStatus(): Promise<string> {
    const [s] = await sql<{ status: string }[]>`
      select status from subscriptions where mp_preapproval_id = 'pre_1'`;
    return s!.status;
  }

  it("un cobro aprobado reactiva y renueva el período de una suscripción vencida", async () => {
    await setProvider(true);
    await sql`insert into subscriptions
      (profile_id, plan, status, mp_preapproval_id, current_period_end)
      values (${PROVIDER}, 'provider_monthly', 'past_due', 'pre_1', now() - interval '2 days')`;

    await processAuthorizedPaymentApproved("pre_1");

    const [s] = await sql<{ status: string; future: boolean }[]>`
      select status, current_period_end > now() as future
      from subscriptions where mp_preapproval_id = 'pre_1'`;
    expect(s!.status).toBe("active");
    expect(s!.future).toBe(true);
    expect(await providerActive()).toBe(true);
  });

  it("una reentrega del mismo cobro no suma otro mes (idempotente)", async () => {
    await setProvider(true);
    await sql`insert into subscriptions
      (profile_id, plan, status, mp_preapproval_id, current_period_end)
      values (${PROVIDER}, 'provider_monthly', 'past_due', 'pre_1', now() - interval '2 days')`;

    await processAuthorizedPaymentApproved("pre_1");
    const [a] = await sql<{ cpe: string }[]>`
      select current_period_end::text as cpe from subscriptions where mp_preapproval_id = 'pre_1'`;

    await processAuthorizedPaymentApproved("pre_1"); // reentrega del webhook
    const [b] = await sql<{ cpe: string }[]>`
      select current_period_end::text as cpe from subscriptions where mp_preapproval_id = 'pre_1'`;

    expect(b!.cpe).toBe(a!.cpe); // el período no se movió
  });

  it("active con período vencido → past_due, el gate sigue abierto (gracia)", async () => {
    await setProvider(true);
    await sql`insert into subscriptions
      (profile_id, plan, status, mp_preapproval_id, current_period_end)
      values (${PROVIDER}, 'provider_monthly', 'active', 'pre_1', now() - interval '1 day')`;

    const res = await expireGracePeriods();
    expect(res.toPastDue).toBeGreaterThanOrEqual(1);

    expect(await subStatus()).toBe("past_due");
    expect(await providerActive()).toBe(true);
  });

  it("past_due pasada la gracia → cancelled y el gate se cierra", async () => {
    await setProvider(true);
    await sql`insert into subscriptions
      (profile_id, plan, status, mp_preapproval_id, current_period_end)
      values (${PROVIDER}, 'provider_monthly', 'past_due', 'pre_1', now() - interval '10 days')`;

    const res = await expireGracePeriods();
    expect(res.cancelled).toBeGreaterThanOrEqual(1);

    expect(await subStatus()).toBe("cancelled");
    expect(await providerActive()).toBe(false);
  });

  it("past_due dentro de la gracia no se corta", async () => {
    await setProvider(true);
    await sql`insert into subscriptions
      (profile_id, plan, status, mp_preapproval_id, current_period_end)
      values (${PROVIDER}, 'provider_monthly', 'past_due', 'pre_1', now() - interval '3 days')`;

    await expireGracePeriods();

    expect(await subStatus()).toBe("past_due");
    expect(await providerActive()).toBe(true);
  });

  it("active con período vigente no cambia", async () => {
    await setProvider(true);
    await sql`insert into subscriptions
      (profile_id, plan, status, mp_preapproval_id, current_period_end)
      values (${PROVIDER}, 'provider_monthly', 'active', 'pre_1', now() + interval '20 days')`;

    await expireGracePeriods();

    expect(await subStatus()).toBe("active");
  });

  // ── getProviderGateState (estado para el banner del lado pro) ──
  it("getProviderGateState: sin plan y en trial → kind 'trial' con los gratis restantes", async () => {
    await sql`insert into provider_profiles (profile_id, jobs_completed) values (${PROVIDER}, 2)`;
    expect(await getProviderGateState(PROVIDER)).toEqual({
      kind: "trial",
      freeJobsLeft: 3,
    });
  });

  it("getProviderGateState: sin plan y con el trial agotado → kind 'blocked'", async () => {
    await sql`insert into provider_profiles (profile_id, jobs_completed) values (${PROVIDER}, 5)`;
    expect((await getProviderGateState(PROVIDER)).kind).toBe("blocked");
  });

  it("getProviderGateState: suscripción activa → kind 'active' (sin aviso)", async () => {
    await sql`insert into provider_profiles (profile_id, jobs_completed) values (${PROVIDER}, 10)`;
    await sql`insert into subscriptions (profile_id, plan, status)
              values (${PROVIDER}, 'provider_monthly', 'active')`;
    expect((await getProviderGateState(PROVIDER)).kind).toBe("active");
  });

  it("getProviderGateState: past_due → kind 'grace' con fecha límite", async () => {
    await sql`insert into provider_profiles (profile_id, jobs_completed) values (${PROVIDER}, 10)`;
    await sql`insert into subscriptions (profile_id, plan, status, current_period_end)
              values (${PROVIDER}, 'provider_monthly', 'past_due', now())`;
    const st = await getProviderGateState(PROVIDER);
    expect(st.kind).toBe("grace");
    if (st.kind === "grace") expect(st.until).not.toBeNull();
  });
});
