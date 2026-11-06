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
 * Cierre del trabajo por el cliente: un profesional que no cumple ya no evita la
 * reseña. También cubre la reseña de un trabajo que "no se hizo" y qué pasa con
 * ella si el admin descarta el reporte.
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
vi.mock("@/lib/push/send", () => ({ sendPushToUsers: vi.fn(async () => {}) }));
vi.mock("@/lib/mercadopago/subscriptions", () => ({
  setPreApprovalStatus: vi.fn(),
}));

const CLIENT = "11111111-1111-1111-1111-111111111111";
const OTHER_CLIENT = "22222222-2222-2222-2222-222222222222";
const PROVIDER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ADMIN = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const CATEGORY = "cccccccc-cccc-cccc-cccc-cccccccccccc";

const asClient: Session = { user: { id: CLIENT }, role: "client" };
const asProvider: Session = { user: { id: PROVIDER }, role: "provider" };
const asAdmin: Session = { user: { id: ADMIN }, role: "admin" };

const NOT_DONE = {
  outcome: "not_done",
  reason: "no_show",
  description: "Acordamos a las 10 y nunca vino ni avisó.",
};
const LOW_ASPECTS = { punctuality: 1, quality: 1, communication: 1, price: 1 };

describe.skipIf(!hasTestDb)("cierre por el cliente (integración)", () => {
  let sql: RawClient;
  let closeJobAsClient: typeof import("@/lib/actions/job-close").closeJobAsClient;
  let submitReview: typeof import("@/lib/actions/review").submitReview;
  let resolveReport: typeof import("@/lib/actions/report").resolveReport;

  beforeAll(async () => {
    sql = rawClient();
    await setupTestSchema(sql);
    ({ closeJobAsClient } = await import("@/lib/actions/job-close"));
    ({ submitReview } = await import("@/lib/actions/review"));
    ({ resolveReport } = await import("@/lib/actions/report"));
  });

  afterAll(async () => {
    await sql.end();
  });

  beforeEach(async () => {
    await truncateAll(sql);
    currentSession = asClient;
    await sql`insert into provider_profiles (profile_id, rating_avg)
              values (${PROVIDER}, '0.0')`;
  });

  async function seedJob(status = "in_progress") {
    const [job] = await sql<{ id: string }[]>`
      insert into jobs
        (client_id, provider_id, category_id, type, status, title, payment_method)
      values
        (${CLIENT}, ${PROVIDER}, ${CATEGORY}, 'scheduled', ${status}, 'Grifería', 'cash')
      returning id`;
    return job!.id;
  }

  async function job(id: string) {
    const [row] = await sql<
      {
        status: string;
        cancel_reason: string | null;
        completed_at: Date | null;
        final_price: string | null;
      }[]
    >`select status, cancel_reason, completed_at, final_price from jobs where id = ${id}`;
    return row!;
  }

  async function jobsCompleted() {
    const [row] = await sql<{ jobs_completed: number }[]>`
      select jobs_completed from provider_profiles where profile_id = ${PROVIDER}`;
    return row!.jobs_completed;
  }

  async function rating() {
    const [row] = await sql<{ rating_avg: string }[]>`
      select rating_avg from provider_profiles where profile_id = ${PROVIDER}`;
    return Number(row!.rating_avg);
  }

  // ── "Se hizo" ──
  it.each(["accepted", "in_progress"])(
    "'se hizo' sobre %s completa el trabajo y suma al profesional",
    async (status) => {
      const id = await seedJob(status);

      const res = await closeJobAsClient({ jobId: id, outcome: "done" });

      expect(res.ok).toBe(true);
      const row = await job(id);
      expect(row.status).toBe("completed");
      expect(row.completed_at).not.toBeNull();
      expect(row.final_price).toBeNull();
      expect(await jobsCompleted()).toBe(1);
    },
  );

  it("'se hizo' enviado dos veces suma un solo trabajo", async () => {
    const id = await seedJob();

    const results = await Promise.all([
      closeJobAsClient({ jobId: id, outcome: "done" }),
      closeJobAsClient({ jobId: id, outcome: "done" }),
    ]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await jobsCompleted()).toBe(1);
  });

  it("'se hizo' habilita la reseña de las dos partes", async () => {
    const id = await seedJob();
    await closeJobAsClient({ jobId: id, outcome: "done" });

    const res = await submitReview({
      jobId: id,
      targetId: PROVIDER,
      aspects: { punctuality: 5, quality: 5, communication: 5, price: 5 },
    });

    expect(res.ok).toBe(true);
  });

  it("avisa al profesional que el cliente cerró el trabajo", async () => {
    const id = await seedJob();

    await closeJobAsClient({ jobId: id, outcome: "done" });

    const rows = await sql<{ user_id: string; link: string }[]>`
      select user_id, link from notifications`;
    expect(rows).toEqual([{ user_id: PROVIDER, link: `/pro/pedido/${id}` }]);
  });

  // ── "No se hizo" ──
  it("'no se hizo' cancela el pedido y crea el reporte contra el profesional", async () => {
    const id = await seedJob();

    const res = await closeJobAsClient({ jobId: id, ...NOT_DONE });

    expect(res.ok).toBe(true);
    expect(await job(id)).toMatchObject({
      status: "cancelled",
      cancel_reason: "not_completed",
    });
    expect(await jobsCompleted()).toBe(0);
    const [report] = await sql<
      { reporter_id: string; target_id: string; reason: string; status: string }[]
    >`select reporter_id, target_id, reason, status from job_reports where job_id = ${id}`;
    expect(report).toEqual({
      reporter_id: CLIENT,
      target_id: PROVIDER,
      reason: "no_show",
      status: "open",
    });
  });

  it("'no se hizo' exige motivo y descripción", async () => {
    const id = await seedJob();

    const res = await closeJobAsClient({
      jobId: id,
      outcome: "not_done",
      reason: "no_show",
      description: "corta",
    });

    expect(res.ok).toBe(false);
    expect((await job(id)).status).toBe("in_progress");
  });

  it("'no se hizo' funciona aunque el cliente ya hubiera reportado", async () => {
    const id = await seedJob();
    await sql`insert into job_reports (job_id, reporter_id, target_id, reason, description)
              values (${id}, ${CLIENT}, ${PROVIDER}, 'payment', 'Reporte previo del cliente.')`;

    const res = await closeJobAsClient({ jobId: id, ...NOT_DONE });

    expect(res.ok).toBe(true);
    expect((await job(id)).status).toBe("cancelled");
    expect(await sql`select 1 from job_reports`).toHaveLength(1);
  });

  // ── Permisos y estados ──
  it("otro cliente no puede cerrar el pedido", async () => {
    const id = await seedJob();
    currentSession = { user: { id: OTHER_CLIENT }, role: "client" };

    const res = await closeJobAsClient({ jobId: id, outcome: "done" });

    expect(res.ok).toBe(false);
    expect((await job(id)).status).toBe("in_progress");
  });

  it("el profesional no puede usar el cierre del cliente", async () => {
    const id = await seedJob();
    currentSession = asProvider;

    const res = await closeJobAsClient({ jobId: id, outcome: "done" });

    expect(res.ok).toBe(false);
  });

  it.each(["requested", "completed", "cancelled"])(
    "no se puede cerrar un pedido en %s",
    async (status) => {
      const id = await seedJob(status);

      const res = await closeJobAsClient({ jobId: id, outcome: "done" });

      expect(res.ok).toBe(false);
      expect((await job(id)).status).toBe(status);
    },
  );

  // ── Reseña de un trabajo que no se hizo ──
  it("el cliente puede reseñar un trabajo que no se hizo", async () => {
    const id = await seedJob();
    await closeJobAsClient({ jobId: id, ...NOT_DONE });

    const res = await submitReview({
      jobId: id,
      targetId: PROVIDER,
      aspects: LOW_ASPECTS,
    });

    expect(res.ok).toBe(true);
    expect(await rating()).toBe(1);
  });

  it("el profesional no puede reseñar un trabajo que no se hizo", async () => {
    const id = await seedJob();
    await closeJobAsClient({ jobId: id, ...NOT_DONE });
    currentSession = asProvider;

    const res = await submitReview({
      jobId: id,
      targetId: CLIENT,
      aspects: { respect: 1, availability: 1, clarity: 1, payment: 1 },
    });

    expect(res.ok).toBe(false);
  });

  it("no se puede reseñar un pedido cancelado por otro motivo", async () => {
    const id = await seedJob("cancelled");

    const res = await submitReview({
      jobId: id,
      targetId: PROVIDER,
      aspects: LOW_ASPECTS,
    });

    expect(res.ok).toBe(false);
  });

  it("cancelar a mano con ese motivo no habilita la reseña sin reporte", async () => {
    const { updateJobStatus } = await import("@/lib/actions/job");
    const id = await seedJob();

    await updateJobStatus({
      jobId: id,
      status: "cancelled",
      reason: "not_completed",
    });
    const res = await submitReview({
      jobId: id,
      targetId: PROVIDER,
      aspects: LOW_ASPECTS,
    });

    expect(res.ok).toBe(false);
    expect((await job(id)).cancel_reason).not.toBe("not_completed");
  });

  // ── Descartar el reporte ──
  async function closedWithReview() {
    const id = await seedJob();
    await closeJobAsClient({ jobId: id, ...NOT_DONE });
    await submitReview({ jobId: id, targetId: PROVIDER, aspects: LOW_ASPECTS });
    const [report] = await sql<{ id: string }[]>`
      select id from job_reports where job_id = ${id}`;
    return { id, reportId: report!.id };
  }

  it("descartar borra la reseña del cliente y recalcula la nota", async () => {
    const { reportId } = await closedWithReview();
    currentSession = asAdmin;

    const res = await resolveReport(
      { reportId, note: "El trabajo se hizo: hay comprobantes." },
      "dismissed",
    );

    expect(res.ok).toBe(true);
    expect(await sql`select 1 from reviews`).toHaveLength(0);
    expect(await rating()).toBe(0);
  });

  it("descartar conserva las demás reseñas del profesional en la nota", async () => {
    const { reportId } = await closedWithReview();
    const previous = await seedJob("completed");
    await submitReview({
      jobId: previous,
      targetId: PROVIDER,
      aspects: { punctuality: 5, quality: 5, communication: 5, price: 5 },
    });
    currentSession = asAdmin;

    await resolveReport({ reportId, note: "El reporte era falso." }, "dismissed");

    expect(await rating()).toBe(5);
  });

  it("tras descartar, el cliente no puede volver a reseñar ese trabajo", async () => {
    const { id, reportId } = await closedWithReview();
    currentSession = asAdmin;
    await resolveReport({ reportId, note: "El reporte era falso." }, "dismissed");
    currentSession = asClient;

    const res = await submitReview({
      jobId: id,
      targetId: PROVIDER,
      aspects: LOW_ASPECTS,
    });

    expect(res.ok).toBe(false);
  });

  it("resolver a favor del cliente conserva la reseña", async () => {
    const { reportId } = await closedWithReview();
    currentSession = asAdmin;

    await resolveReport({ reportId, note: "El cliente tenía razón." }, "resolved");

    expect(await sql`select 1 from reviews`).toHaveLength(1);
    expect(await rating()).toBe(1);
  });

  it("descartar un reporte de un trabajo completado no borra reseñas", async () => {
    const id = await seedJob("completed");
    await submitReview({ jobId: id, targetId: PROVIDER, aspects: LOW_ASPECTS });
    const [report] = await sql<{ id: string }[]>`
      insert into job_reports (job_id, reporter_id, target_id, reason, description)
      values (${id}, ${CLIENT}, ${PROVIDER}, 'other', 'Reporte de un trabajo completado.')
      returning id`;
    currentSession = asAdmin;

    await resolveReport(
      { reportId: report!.id, note: "Sin elementos para actuar." },
      "dismissed",
    );

    expect(await sql`select 1 from reviews`).toHaveLength(1);
  });
});
