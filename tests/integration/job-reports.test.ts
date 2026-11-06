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
 * Reportes de un trabajo y su resolución por el admin, incluida la suspensión
 * del profesional. Requieren `TEST_DATABASE_URL`; si no está, el bloque se salta.
 */

type Session = {
  user: { id: string };
  role: "client" | "provider" | "admin";
} | null;

let currentSession: Session = null;

const { setPreApprovalStatus } = vi.hoisted(() => ({
  setPreApprovalStatus: vi.fn(async (_id: string, _status: string) => {}),
}));

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(async () => currentSession),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/push/send", () => ({ sendPushToUsers: vi.fn(async () => {}) }));
vi.mock("@/lib/mercadopago/subscriptions", () => ({ setPreApprovalStatus }));

const CLIENT = "11111111-1111-1111-1111-111111111111";
const STRANGER = "22222222-2222-2222-2222-222222222222";
const PROVIDER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ADMIN = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const CATEGORY = "cccccccc-cccc-cccc-cccc-cccccccccccc";

const asClient: Session = { user: { id: CLIENT }, role: "client" };
const asProvider: Session = { user: { id: PROVIDER }, role: "provider" };
const asAdmin: Session = { user: { id: ADMIN }, role: "admin" };

const DESCRIPTION = "Dijo que venía a las 10 y nunca apareció.";

describe.skipIf(!hasTestDb)("reportes (integración)", () => {
  let sql: RawClient;
  let report: typeof import("@/lib/actions/report");

  beforeAll(async () => {
    sql = rawClient();
    await setupTestSchema(sql);
    report = await import("@/lib/actions/report");
  });

  afterAll(async () => {
    await sql.end();
  });

  beforeEach(async () => {
    await truncateAll(sql);
    currentSession = null;
    setPreApprovalStatus.mockReset();
    setPreApprovalStatus.mockResolvedValue(undefined);
    await sql`insert into provider_profiles (profile_id, is_online)
              values (${PROVIDER}, true)`;
  });

  async function seedJob(status = "accepted", providerId: string | null = PROVIDER) {
    const [job] = await sql<{ id: string }[]>`
      insert into jobs
        (client_id, provider_id, category_id, type, status, title, payment_method)
      values
        (${CLIENT}, ${providerId}, ${CATEGORY}, 'scheduled', ${status}, 'Grifería', 'cash')
      returning id`;
    return job!.id;
  }

  /** Reporte abierto de `reporter` sobre un pedido nuevo. */
  async function seedReport(reporter = CLIENT) {
    const jobId = await seedJob();
    const target = reporter === CLIENT ? PROVIDER : CLIENT;
    const [row] = await sql<{ id: string }[]>`
      insert into job_reports (job_id, reporter_id, target_id, reason, description)
      values (${jobId}, ${reporter}, ${target}, 'no_show', ${DESCRIPTION})
      returning id`;
    return row!.id;
  }

  async function reportRow(id: string) {
    const [row] = await sql<
      { status: string; admin_note: string | null; resolved_by: string | null }[]
    >`select status, admin_note, resolved_by from job_reports where id = ${id}`;
    return row!;
  }

  async function provider() {
    const [row] = await sql<
      {
        verification_status: string;
        rejection_reason: string | null;
        is_online: boolean;
        subscription_active: boolean;
      }[]
    >`select verification_status, rejection_reason, is_online, subscription_active
      from provider_profiles where profile_id = ${PROVIDER}`;
    return row!;
  }

  // ── Crear un reporte ──
  it("el cliente reporta y el reportado es el profesional", async () => {
    const jobId = await seedJob();
    currentSession = asClient;

    const res = await report.createJobReport({
      jobId,
      reason: "no_show",
      description: DESCRIPTION,
      targetId: STRANGER, // se ignora: lo fija el servidor
    });

    expect(res.ok).toBe(true);
    const [row] = await sql<
      { reporter_id: string; target_id: string; status: string }[]
    >`select reporter_id, target_id, status from job_reports`;
    expect(row).toMatchObject({
      reporter_id: CLIENT,
      target_id: PROVIDER,
      status: "open",
    });
  });

  it("el profesional reporta y el reportado es el cliente", async () => {
    const jobId = await seedJob("completed");
    currentSession = asProvider;

    const res = await report.createJobReport({
      jobId,
      reason: "payment",
      description: "No me pagó lo acordado al terminar.",
    });

    expect(res.ok).toBe(true);
    const [row] = await sql<{ target_id: string }[]>`
      select target_id from job_reports`;
    expect(row!.target_id).toBe(CLIENT);
  });

  it("alguien ajeno al trabajo no puede reportar", async () => {
    const jobId = await seedJob();
    currentSession = { user: { id: STRANGER }, role: "client" };

    const res = await report.createJobReport({
      jobId,
      reason: "no_show",
      description: DESCRIPTION,
    });

    expect(res.ok).toBe(false);
    expect(await sql`select 1 from job_reports`).toHaveLength(0);
  });

  it.each(["requested", "broadcasting"])(
    "no se puede reportar un pedido en %s",
    async (status) => {
      const jobId = await seedJob(status);
      currentSession = asClient;

      const res = await report.createJobReport({
        jobId,
        reason: "no_show",
        description: DESCRIPTION,
      });

      expect(res.ok).toBe(false);
    },
  );

  it("cada parte reporta una sola vez por trabajo, aun con dos envíos a la vez", async () => {
    const jobId = await seedJob();
    currentSession = asClient;
    const input = { jobId, reason: "no_show", description: DESCRIPTION };

    const results = await Promise.all([
      report.createJobReport(input),
      report.createJobReport(input),
    ]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await sql`select 1 from job_reports`).toHaveLength(1);
  });

  it("las dos partes pueden reportar el mismo trabajo", async () => {
    const jobId = await seedJob();
    const input = { jobId, reason: "other", description: DESCRIPTION };

    currentSession = asClient;
    expect((await report.createJobReport(input)).ok).toBe(true);
    currentSession = asProvider;
    expect((await report.createJobReport(input)).ok).toBe(true);
  });

  it.each([
    { reason: "no_show", description: "corta" },
    { reason: "inventado", description: DESCRIPTION },
  ])("rechaza datos inválidos: $reason / $description", async (input) => {
    const jobId = await seedJob();
    currentSession = asClient;

    const res = await report.createJobReport({ jobId, ...input });

    expect(res.ok).toBe(false);
  });

  // ── Resolver ──
  it("el admin resuelve un reporte con una nota", async () => {
    const id = await seedReport();
    currentSession = asAdmin;

    const res = await report.resolveReport(
      { reportId: id, note: "Hablamos con las dos partes." },
      "resolved",
    );

    expect(res.ok).toBe(true);
    expect(await reportRow(id)).toMatchObject({
      status: "resolved",
      admin_note: "Hablamos con las dos partes.",
      resolved_by: ADMIN,
    });
  });

  it("el admin descarta un reporte", async () => {
    const id = await seedReport();
    currentSession = asAdmin;

    await report.resolveReport(
      { reportId: id, note: "El trabajo se hizo bien." },
      "dismissed",
    );

    expect((await reportRow(id)).status).toBe("dismissed");
  });

  it("un reporte cerrado no se vuelve a cerrar", async () => {
    const id = await seedReport();
    currentSession = asAdmin;
    await report.resolveReport({ reportId: id, note: "Primera nota." }, "resolved");

    const res = await report.resolveReport(
      { reportId: id, note: "Segunda nota." },
      "dismissed",
    );

    expect(res.ok).toBe(false);
    expect(await reportRow(id)).toMatchObject({
      status: "resolved",
      admin_note: "Primera nota.",
    });
  });

  it("resolver exige una nota", async () => {
    const id = await seedReport();
    currentSession = asAdmin;

    const res = await report.resolveReport({ reportId: id, note: "" }, "resolved");

    expect(res.ok).toBe(false);
    expect((await reportRow(id)).status).toBe("open");
  });

  // ── Solo el admin ──
  it.each([
    ["un cliente", asClient],
    ["un profesional", asProvider],
    ["alguien sin sesión", null],
  ] as const)("%s no puede resolver ni suspender", async (_label, session) => {
    const id = await seedReport();
    currentSession = session;

    const resolved = await report.resolveReport(
      { reportId: id, note: "Lo cierro yo." },
      "resolved",
    );
    const suspended = await report.suspendReportedProvider({
      reportId: id,
      note: "Lo suspendo yo.",
    });

    expect(resolved.ok).toBe(false);
    expect(suspended.ok).toBe(false);
    expect((await reportRow(id)).status).toBe("open");
    expect((await provider()).verification_status).toBe("approved");
  });

  // ── Suspender ──
  const NOTE = "Robó herramientas en un domicilio.";

  it("suspender cierra el acceso del profesional y resuelve el reporte", async () => {
    const id = await seedReport();
    currentSession = asAdmin;

    const res = await report.suspendReportedProvider({ reportId: id, note: NOTE });

    expect(res).toEqual({ ok: true });
    expect(await provider()).toMatchObject({
      verification_status: "rejected",
      rejection_reason: NOTE,
      is_online: false,
    });
    expect(await reportRow(id)).toMatchObject({
      status: "resolved",
      admin_note: `Profesional suspendido: ${NOTE}`,
      resolved_by: ADMIN,
    });
    expect(setPreApprovalStatus).not.toHaveBeenCalled();
    const [notification] = await sql<{ user_id: string; type: string }[]>`
      select user_id, type from notifications`;
    expect(notification).toEqual({
      user_id: PROVIDER,
      type: "provider_suspended",
    });
  });

  it("suspender pausa la suscripción activa para no seguir cobrando", async () => {
    const id = await seedReport();
    await sql`update provider_profiles set subscription_active = true
              where profile_id = ${PROVIDER}`;
    await sql`insert into subscriptions (profile_id, plan, status, mp_preapproval_id)
              values (${PROVIDER}, 'provider_monthly', 'active', 'mp-1')`;
    currentSession = asAdmin;

    const res = await report.suspendReportedProvider({ reportId: id, note: NOTE });

    expect(res).toEqual({ ok: true });
    expect(setPreApprovalStatus).toHaveBeenCalledWith("mp-1", "paused");
    const [sub] = await sql<{ status: string }[]>`select status from subscriptions`;
    expect(sub!.status).toBe("paused");
    expect((await provider()).subscription_active).toBe(false);
  });

  it("si Mercado Pago falla, la suspensión queda y el admin recibe un aviso", async () => {
    const id = await seedReport();
    await sql`update provider_profiles set subscription_active = true
              where profile_id = ${PROVIDER}`;
    await sql`insert into subscriptions (profile_id, plan, status, mp_preapproval_id)
              values (${PROVIDER}, 'provider_monthly', 'active', 'mp-1')`;
    setPreApprovalStatus.mockRejectedValue({ status: 500, message: "caído" });
    currentSession = asAdmin;

    const res = await report.suspendReportedProvider({ reportId: id, note: NOTE });

    expect(res).toMatchObject({ ok: true, warning: expect.any(String) });
    expect((await provider()).verification_status).toBe("rejected");
    const [sub] = await sql<{ status: string }[]>`select status from subscriptions`;
    expect(sub!.status).toBe("active");
  });

  it("no se puede suspender desde un reporte contra un cliente", async () => {
    const id = await seedReport(PROVIDER);
    currentSession = asAdmin;

    const res = await report.suspendReportedProvider({ reportId: id, note: NOTE });

    expect(res.ok).toBe(false);
    expect((await provider()).verification_status).toBe("approved");
    expect((await reportRow(id)).status).toBe("open");
  });

  it("no se puede suspender desde un reporte ya cerrado", async () => {
    const id = await seedReport();
    currentSession = asAdmin;
    await report.resolveReport({ reportId: id, note: "Ya lo resolvimos." }, "dismissed");

    const res = await report.suspendReportedProvider({ reportId: id, note: NOTE });

    expect(res.ok).toBe(false);
    expect((await provider()).verification_status).toBe("approved");
  });
});
