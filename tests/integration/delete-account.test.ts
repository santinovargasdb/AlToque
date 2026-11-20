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
 * Baja de la cuenta: qué se borra, qué se anonimiza y cuándo se frena.
 *
 * Requieren `TEST_DATABASE_URL`; si no está, el bloque se salta.
 */

type Session = {
  user: { id: string };
  role: "client" | "provider" | "admin";
} | null;

let currentSession: Session = null;

const setPreApprovalStatus = vi.fn();
const deleteUser = vi.fn();
const signOut = vi.fn();
const removeFiles = vi.fn();

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(async () => currentSession),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("@/lib/audit", () => ({ logSecurityEvent: vi.fn() }));
vi.mock("@/lib/mercadopago/subscriptions", () => ({
  setPreApprovalStatus: (...args: unknown[]) => setPreApprovalStatus(...args),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { signOut } })),
  createServiceClient: vi.fn(() => ({
    auth: { admin: { deleteUser } },
    storage: {
      from: (bucket: string) => ({
        list: vi.fn(async () => ({
          data: [{ name: `${bucket}-archivo.jpg` }],
          error: null,
        })),
        remove: async (paths: string[]) => {
          removeFiles(bucket, paths);
          return { error: null };
        },
      }),
    },
  })),
}));

const CLIENT = "11111111-1111-1111-1111-111111111111";
const PROVIDER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ADMIN = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const CATEGORY = "cccccccc-cccc-cccc-cccc-cccccccccccc";

const asClient: Session = { user: { id: CLIENT }, role: "client" };
const asProvider: Session = { user: { id: PROVIDER }, role: "provider" };

const CONFIRM = { confirmation: "ELIMINAR" };

describe.skipIf(!hasTestDb)("baja de la cuenta (integración)", () => {
  let sql: RawClient;
  let deleteAccount: typeof import("@/lib/actions/account").deleteAccount;

  beforeAll(async () => {
    sql = rawClient();
    await setupTestSchema(sql);
    ({ deleteAccount } = await import("@/lib/actions/account"));
  });

  afterAll(async () => {
    await sql.end();
  });

  beforeEach(async () => {
    await truncateAll(sql);
    vi.clearAllMocks();
    setPreApprovalStatus.mockResolvedValue(undefined);
    deleteUser.mockResolvedValue({ error: null });
    signOut.mockResolvedValue({ error: null });
    currentSession = asProvider;

    await sql`insert into profiles (id, full_name, phone, avatar_url) values
      (${CLIENT}, 'Ana Cliente', '1144445555', 'https://x/avatars/a.jpg'),
      (${PROVIDER}, 'Juan Plomero', '1166667777', 'https://x/avatars/j.jpg')`;
    await sql`insert into provider_profiles
        (profile_id, bio, id_document_url, selfie_url, subscription_active, is_online)
      values (${PROVIDER}, 'Plomero matriculado', 'p/dni.jpg', 'p/selfie.jpg', true, true)`;
    await sql`insert into provider_categories (provider_id, category_id)
      values (${PROVIDER}, ${CATEGORY})`;
  });

  async function seedJob(status: string) {
    const [job] = await sql<{ id: string }[]>`
      insert into jobs
        (client_id, provider_id, category_id, type, status, title, payment_method)
      values
        (${CLIENT}, ${PROVIDER}, ${CATEGORY}, 'scheduled', ${status}, 'Grifería', 'cash')
      returning id`;
    return job!.id;
  }

  async function profile(id: string) {
    const [row] = await sql<
      { full_name: string | null; phone: string | null; avatar_url: string | null }[]
    >`select full_name, phone, avatar_url from profiles where id = ${id}`;
    return row;
  }

  async function count(table: string, column: string, id: string) {
    const [row] = await sql.unsafe<{ n: number }[]>(
      `select count(*)::int as n from ${table} where ${column} = $1`,
      [id],
    );
    return row!.n;
  }

  it("sin sesión no hace nada", async () => {
    currentSession = null;
    const res = await deleteAccount(CONFIRM);
    expect(res).toEqual({ ok: false, error: "No autorizado." });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("no elimina cuentas de administración", async () => {
    currentSession = { user: { id: ADMIN }, role: "admin" };
    const res = await deleteAccount(CONFIRM);
    expect(res.ok).toBe(false);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("exige la palabra de confirmación", async () => {
    const res = await deleteAccount({ confirmation: "borrar" });
    expect(res.ok).toBe(false);
    expect(await profile(PROVIDER)).toMatchObject({ full_name: "Juan Plomero" });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it.each(["accepted", "in_progress"])(
    "con un trabajo %s no deja eliminar",
    async (status) => {
      await seedJob(status);
      const res = await deleteAccount(CONFIRM);
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/trabajos en curso/);
      expect(await profile(PROVIDER)).toMatchObject({ phone: "1166667777" });
      expect(deleteUser).not.toHaveBeenCalled();
    },
  );

  it("sin historial borra el perfil entero y el usuario de auth", async () => {
    await expect(deleteAccount(CONFIRM)).rejects.toThrow(/REDIRECT:\/ingresar/);

    expect(await profile(PROVIDER)).toBeUndefined();
    expect(await count("provider_profiles", "profile_id", PROVIDER)).toBe(0);
    expect(await count("provider_categories", "provider_id", PROVIDER)).toBe(0);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(deleteUser).toHaveBeenCalledWith(PROVIDER);
    // El otro usuario no se toca.
    expect(await profile(CLIENT)).toMatchObject({ full_name: "Ana Cliente" });
  });

  it("con historial anonimiza y saca al profesional de las búsquedas", async () => {
    const jobId = await seedJob("completed");
    await sql`insert into messages (job_id, sender_id, body)
              values (${jobId}, ${PROVIDER}, 'Voy en camino')`;
    await sql`insert into reviews (job_id, author_id, target_id, rating)
              values (${jobId}, ${CLIENT}, ${PROVIDER}, '5.0')`;
    await sql`insert into notifications (user_id, type, title)
              values (${PROVIDER}, 'new_message', 'Mensaje')`;
    await sql`insert into push_subscriptions (user_id, endpoint, p256dh, auth)
              values (${PROVIDER}, 'https://push/1', 'k', 'a')`;

    await expect(deleteAccount(CONFIRM)).rejects.toThrow(/REDIRECT/);

    expect(await profile(PROVIDER)).toEqual({
      full_name: "Usuario eliminado",
      phone: null,
      avatar_url: null,
    });
    const [pp] = await sql<
      {
        bio: string | null;
        id_document_url: string | null;
        selfie_url: string | null;
        subscription_active: boolean;
        is_online: boolean;
        verification_status: string;
      }[]
    >`select bio, id_document_url, selfie_url, subscription_active, is_online,
             verification_status
      from provider_profiles where profile_id = ${PROVIDER}`;
    expect(pp).toEqual({
      bio: null,
      id_document_url: null,
      selfie_url: null,
      subscription_active: false,
      is_online: false,
      verification_status: "rejected",
    });
    expect(await count("provider_categories", "provider_id", PROVIDER)).toBe(0);
    expect(await count("notifications", "user_id", PROVIDER)).toBe(0);
    expect(await count("push_subscriptions", "user_id", PROVIDER)).toBe(0);
    // El historial de la otra parte sigue ahí.
    expect(await count("jobs", "id", jobId)).toBe(1);
    expect(await count("messages", "job_id", jobId)).toBe(1);
    expect(await count("reviews", "job_id", jobId)).toBe(1);
    expect(deleteUser).toHaveBeenCalledWith(PROVIDER);
  });

  it("cancela los pedidos abiertos y avisa al cliente que esperaba", async () => {
    const jobId = await seedJob("requested");

    await expect(deleteAccount(CONFIRM)).rejects.toThrow(/REDIRECT/);

    const [job] = await sql<{ status: string; cancel_reason: string | null }[]>`
      select status, cancel_reason from jobs where id = ${jobId}`;
    expect(job).toEqual({ status: "cancelled", cancel_reason: "account_deleted" });
    const notes = await sql<{ type: string; link: string }[]>`
      select type, link from notifications where user_id = ${CLIENT}`;
    expect(notes).toEqual([{ type: "job_cancelled", link: `/pedido/${jobId}` }]);
  });

  it("el cliente que se va no se avisa a sí mismo", async () => {
    currentSession = asClient;
    const jobId = await seedJob("requested");

    await expect(deleteAccount(CONFIRM)).rejects.toThrow(/REDIRECT/);

    expect(await count("notifications", "user_id", CLIENT)).toBe(0);
    const [job] = await sql<{ status: string }[]>`
      select status from jobs where id = ${jobId}`;
    expect(job!.status).toBe("cancelled");
    expect(await profile(CLIENT)).toMatchObject({ full_name: "Usuario eliminado" });
    // El profesional sigue intacto.
    expect(await profile(PROVIDER)).toMatchObject({ full_name: "Juan Plomero" });
  });

  it("cancela la suscripción en Mercado Pago y borra la fila", async () => {
    await sql`insert into subscriptions (profile_id, plan, status, mp_preapproval_id)
              values (${PROVIDER}, 'provider_monthly', 'active', 'pre_123')`;

    await expect(deleteAccount(CONFIRM)).rejects.toThrow(/REDIRECT/);

    expect(setPreApprovalStatus).toHaveBeenCalledWith("pre_123", "cancelled");
    expect(await count("subscriptions", "profile_id", PROVIDER)).toBe(0);
  });

  it("si Mercado Pago falla con una suscripción activa, no borra nada", async () => {
    await sql`insert into subscriptions (profile_id, plan, status, mp_preapproval_id)
              values (${PROVIDER}, 'provider_monthly', 'active', 'pre_123')`;
    setPreApprovalStatus.mockRejectedValue(new Error("MP caído"));

    const res = await deleteAccount(CONFIRM);

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Mercado Pago/);
    expect(await profile(PROVIDER)).toMatchObject({ full_name: "Juan Plomero" });
    expect(await count("subscriptions", "profile_id", PROVIDER)).toBe(1);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("una suscripción pendiente que MP no deja cancelar no frena la baja", async () => {
    await sql`insert into subscriptions (profile_id, plan, status, mp_preapproval_id)
              values (${PROVIDER}, 'provider_monthly', 'pending', 'pre_999')`;
    setPreApprovalStatus.mockRejectedValue(new Error("no cancelable"));

    await expect(deleteAccount(CONFIRM)).rejects.toThrow(/REDIRECT/);

    expect(await profile(PROVIDER)).toBeUndefined();
  });

  it("borra del Storage los documentos y el avatar del usuario", async () => {
    await expect(deleteAccount(CONFIRM)).rejects.toThrow(/REDIRECT/);

    expect(removeFiles).toHaveBeenCalledWith("verification", [
      `${PROVIDER}/verification-archivo.jpg`,
    ]);
    expect(removeFiles).toHaveBeenCalledWith("avatars", [
      `${PROVIDER}/avatars-archivo.jpg`,
    ]);
  });

  it("si auth no deja borrar el usuario, lo informa", async () => {
    deleteUser.mockResolvedValue({ error: { message: "boom" } });

    const res = await deleteAccount(CONFIRM);

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/altoquecorp@gmail.com/);
  });
});
