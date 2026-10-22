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
 * Tests de integración de `sendMessage` (chat por trabajo, Step 11): solo las
 * partes (cliente o profesional asignado) y solo con el pedido en un estado
 * chateable (accepted/in_progress/completed). Inserta el mensaje y notifica
 * (in-app) a la contraparte.
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
vi.mock("@/lib/push/send", () => ({ sendPushToUsers: vi.fn(async () => {}) }));

const CLIENT = "11111111-1111-1111-1111-111111111111";
const PROVIDER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const STRANGER = "99999999-9999-9999-9999-999999999999";
const CATEGORY = "cccccccc-cccc-cccc-cccc-cccccccccccc";

describe.skipIf(!hasTestDb)("sendMessage (integración)", () => {
  let sql: RawClient;
  let sendMessage: typeof import("@/lib/actions/message").sendMessage;

  beforeAll(async () => {
    sql = rawClient();
    await setupTestSchema(sql);
    ({ sendMessage } = await import("@/lib/actions/message"));
  });

  afterAll(async () => {
    await sql.end();
  });

  beforeEach(async () => {
    await truncateAll(sql);
    currentSession = null;
  });

  async function seedJob(status: string): Promise<string> {
    const [job] = await sql<{ id: string }[]>`
      insert into jobs
        (client_id, provider_id, category_id, type, status, title, payment_method)
      values
        (${CLIENT}, ${PROVIDER}, ${CATEGORY}, 'scheduled', ${status}, 'Cambio de cerradura', 'cash')
      returning id`;
    return job!.id;
  }

  it("el cliente envía un mensaje en un pedido aceptado y notifica al profesional", async () => {
    const jobId = await seedJob("accepted");
    currentSession = { user: { id: CLIENT }, role: "client" };

    const res = await sendMessage({ jobId, body: "Hola, ¿a qué hora venís?" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.message.senderId).toBe(CLIENT);

    const msgs = await sql<{ sender_id: string }[]>`
      select sender_id from messages where job_id = ${jobId}`;
    expect(msgs).toHaveLength(1);

    const notifs = await sql<{ user_id: string; type: string }[]>`
      select user_id, type from notifications`;
    expect(notifs).toHaveLength(1);
    expect(notifs[0]!.user_id).toBe(PROVIDER);
    expect(notifs[0]!.type).toBe("new_message");
  });

  it("el profesional envía en un pedido en curso y notifica al cliente", async () => {
    const jobId = await seedJob("in_progress");
    currentSession = { user: { id: PROVIDER }, role: "provider" };

    const res = await sendMessage({ jobId, body: "Salgo en 10 minutos" });
    expect(res.ok).toBe(true);

    const [notif] = await sql<{ user_id: string }[]>`
      select user_id from notifications`;
    expect(notif!.user_id).toBe(CLIENT);
  });

  it("rechaza a quien no es parte del pedido", async () => {
    const jobId = await seedJob("accepted");
    currentSession = { user: { id: STRANGER }, role: "client" };

    const res = await sendMessage({ jobId, body: "Hola" });
    expect(res.ok).toBe(false);

    const msgs = await sql`select id from messages where job_id = ${jobId}`;
    expect(msgs).toHaveLength(0);
  });

  it("rechaza el chat si el pedido no está en un estado chateable", async () => {
    const jobId = await seedJob("requested");
    currentSession = { user: { id: CLIENT }, role: "client" };

    const res = await sendMessage({ jobId, body: "Hola" });
    expect(res.ok).toBe(false);
  });

  it("valida el cuerpo del mensaje (rechaza vacío)", async () => {
    const jobId = await seedJob("accepted");
    currentSession = { user: { id: CLIENT }, role: "client" };

    const res = await sendMessage({ jobId, body: "   " });
    expect(res.ok).toBe(false);
  });
});
