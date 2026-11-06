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
 * Retomar una suscripción `pending`: antes de crear otro preapproval se consulta
 * el que ya existe. Crear uno nuevo pisaría el ID guardado y el pago hecho sobre
 * el anterior quedaría ignorado por el webhook.
 *
 * Requieren `TEST_DATABASE_URL`; si no está, el bloque se salta.
 */

type Session = {
  user: { id: string; email: string };
  role: "client" | "provider" | "admin";
} | null;

let currentSession: Session = null;

const { createPreApproval, fetchPreApproval } = vi.hoisted(() => ({
  createPreApproval: vi.fn(),
  fetchPreApproval: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(async () => currentSession),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/mercadopago/subscriptions", () => ({
  createPreApproval,
  fetchPreApproval,
  setPreApprovalStatus: vi.fn(),
}));

const PROVIDER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const CLIENT = "11111111-1111-1111-1111-111111111111";

describe.skipIf(!hasTestDb)("retomar suscripción pendiente (integración)", () => {
  let sql: RawClient;
  let startProviderSubscription: typeof import("@/lib/actions/subscription").startProviderSubscription;
  let startClientSubscription: typeof import("@/lib/actions/subscription").startClientSubscription;

  beforeAll(async () => {
    sql = rawClient();
    await setupTestSchema(sql);
    ({ startProviderSubscription, startClientSubscription } = await import(
      "@/lib/actions/subscription"
    ));
  });

  afterAll(async () => {
    await sql.end();
  });

  beforeEach(async () => {
    await truncateAll(sql);
    createPreApproval.mockReset();
    fetchPreApproval.mockReset();
    createPreApproval.mockResolvedValue({
      preapprovalId: "mp-nuevo",
      initPoint: "https://mp.test/nuevo",
    });
    currentSession = {
      user: { id: PROVIDER, email: "pro@altoque.test" },
      role: "provider",
    };
    await sql`insert into provider_profiles (profile_id) values (${PROVIDER})`;
    await sql`insert into subscriptions (profile_id, plan, status, mp_preapproval_id)
              values (${PROVIDER}, 'provider_monthly', 'pending', 'mp-viejo')`;
  });

  async function subscription(profileId = PROVIDER) {
    const [row] = await sql<{ status: string; mp_preapproval_id: string }[]>`
      select status, mp_preapproval_id from subscriptions
      where profile_id = ${profileId}`;
    return row!;
  }

  it("si ya autorizó en MP activa la suscripción sin crear otra", async () => {
    fetchPreApproval.mockResolvedValue({ status: "authorized", initPoint: null });

    const res = await startProviderSubscription();

    expect(res).toEqual({ ok: true, initPoint: "/pro/suscripcion" });
    expect(createPreApproval).not.toHaveBeenCalled();
    expect(await subscription()).toMatchObject({
      status: "active",
      mp_preapproval_id: "mp-viejo",
    });
    const [pp] = await sql<{ subscription_active: boolean }[]>`
      select subscription_active from provider_profiles where profile_id = ${PROVIDER}`;
    expect(pp!.subscription_active).toBe(true);
  });

  it("si sigue pendiente en MP reutiliza el mismo link de pago", async () => {
    fetchPreApproval.mockResolvedValue({
      status: "pending",
      initPoint: "https://mp.test/viejo",
    });

    const res = await startProviderSubscription();

    expect(res).toEqual({ ok: true, initPoint: "https://mp.test/viejo" });
    expect(createPreApproval).not.toHaveBeenCalled();
    expect((await subscription()).mp_preapproval_id).toBe("mp-viejo");
  });

  it("si MP no lo encuentra crea uno nuevo", async () => {
    fetchPreApproval.mockResolvedValue(null);

    const res = await startProviderSubscription();

    expect(res).toEqual({ ok: true, initPoint: "https://mp.test/nuevo" });
    expect((await subscription()).mp_preapproval_id).toBe("mp-nuevo");
  });

  it("si está cancelado en MP crea uno nuevo", async () => {
    fetchPreApproval.mockResolvedValue({ status: "cancelled", initPoint: null });

    const res = await startProviderSubscription();

    expect(res).toEqual({ ok: true, initPoint: "https://mp.test/nuevo" });
  });

  it("si la consulta a MP falla no pisa el preapproval guardado", async () => {
    fetchPreApproval.mockRejectedValue({ status: 500, message: "caído" });

    const res = await startProviderSubscription();

    expect(res.ok).toBe(false);
    expect(createPreApproval).not.toHaveBeenCalled();
    expect((await subscription()).mp_preapproval_id).toBe("mp-viejo");
  });

  it("una suscripción pendiente reciente ocupa cupo fundador y una vieja no", async () => {
    const { countFoundingSlotsTaken } = await import("@/lib/subscriptions/status");

    expect(await countFoundingSlotsTaken()).toBe(1);

    await sql`update subscriptions set updated_at = now() - interval '25 hours'`;

    expect(await countFoundingSlotsTaken()).toBe(0);
  });

  it("el plan Premium del cliente sigue la misma regla", async () => {
    currentSession = {
      user: { id: CLIENT, email: "cli@altoque.test" },
      role: "client",
    };
    await sql`insert into subscriptions (profile_id, plan, status, mp_preapproval_id)
              values (${CLIENT}, 'client_monthly', 'pending', 'mp-cliente')`;
    fetchPreApproval.mockResolvedValue({ status: "authorized", initPoint: null });

    const res = await startClientSubscription();

    expect(res).toEqual({ ok: true, initPoint: "/suscripcion" });
    expect(createPreApproval).not.toHaveBeenCalled();
    expect((await subscription(CLIENT)).status).toBe("active");
  });
});
