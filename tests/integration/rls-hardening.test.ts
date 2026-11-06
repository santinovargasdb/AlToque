import { readFileSync } from "node:fs";
import postgres from "postgres";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  hasTestDb,
  rawClient,
  setupTestSchema,
  TEST_DATABASE_URL,
  truncateAll,
  type RawClient,
} from "../helpers/test-db";

/**
 * Ataques directos a la API de Supabase: el navegador tiene la clave pública y
 * puede escribir sin pasar por las Server Actions. Corren con los roles reales
 * `anon` y `authenticated`, para que Postgres aplique RLS como en producción.
 *
 * `RLS_SQL_FILE` permite correrlos contra otro juego de policies.
 * Requieren `TEST_DATABASE_URL`; si no está, el bloque se salta.
 */

const CLIENT = "11111111-1111-1111-1111-111111111111";
const OTHER_CLIENT = "22222222-2222-2222-2222-222222222222";
const PROVIDER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const CATEGORY = "cccccccc-cccc-cccc-cccc-cccccccccccc";

const RLS_FILE = process.env.RLS_SQL_FILE ?? "drizzle/rls-hardening.sql";

/** Tablas y funciones de Supabase que el esquema reducido de test no trae. */
const SUPABASE_STUBS = `
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
    if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then create role supabase_auth_admin; end if;
  end $$;

  drop schema if exists auth cascade;
  create schema auth;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as $f$
    select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
  $f$;
  grant usage on schema auth to anon, authenticated, supabase_auth_admin;
  grant execute on function auth.uid() to anon, authenticated, supabase_auth_admin;

  drop type if exists role cascade;
  create type role as enum ('client', 'provider', 'admin');
  alter table profiles add column role role not null default 'client',
    add column full_name text, add column phone text,
    add column updated_at timestamptz not null default now();
  alter table provider_profiles add column id_document_url text;
  create table if not exists provider_categories (provider_id uuid, category_id uuid);

  create or replace function auth_role() returns text as $f$
    select coalesce(
      nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'user_role', ''),
      (select role::text from profiles where id = auth.uid())
    );
  $f$ language sql stable set search_path = public;
  create or replace function is_admin() returns boolean as $f$
    select auth_role() = 'admin';
  $f$ language sql stable set search_path = public;

  alter table profiles enable row level security;
  alter table provider_profiles enable row level security;
  alter table provider_categories enable row level security;
  alter table jobs enable row level security;
  alter table job_dispatch enable row level security;
  alter table reviews enable row level security;
  alter table review_aspects enable row level security;
  alter table messages enable row level security;
  alter table notifications enable row level security;
  alter table subscriptions enable row level security;

  -- Vive en postgis.sql, que no se puede correr acá (requiere PostGIS).
  create policy notif_self_rw on notifications
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

  grant usage on schema public to anon, authenticated, supabase_auth_admin;
  grant all on all tables in schema public to anon, authenticated;
  grant select on profiles to supabase_auth_admin;
`;

describe.skipIf(!hasTestDb)("RLS contra la API directa (integración)", () => {
  let sql: RawClient;

  beforeAll(async () => {
    sql = rawClient();
    await setupTestSchema(sql);
    await sql.unsafe(SUPABASE_STUBS).simple();
    await sql.unsafe(readFileSync("drizzle/auth-triggers.sql", "utf8")).simple();
    // El script maneja su transacción: necesita una sola conexión, como el SQL Editor.
    const single = postgres(TEST_DATABASE_URL!, {
      max: 1,
      prepare: false,
      onnotice: () => {},
    });
    await single.unsafe(readFileSync(RLS_FILE, "utf8")).simple();
    await single.end();
  });

  afterAll(async () => {
    await sql.unsafe("drop schema if exists auth cascade").simple();
    await sql.end();
  });

  beforeEach(async () => {
    await truncateAll(sql);
    await sql`truncate table auth.users, provider_categories`;
    await sql`insert into profiles (id, role, phone) values
      (${CLIENT}, 'client', '1111'),
      (${OTHER_CLIENT}, 'client', '2222'),
      (${PROVIDER}, 'provider', '3333')`;
    await sql`insert into provider_profiles (profile_id, verification_status, id_document_url)
      values (${PROVIDER}, 'pending', 'privado/dni.jpg')`;
  });

  /** Corre `fn` como ese usuario, con RLS aplicado. Sin `uid`, como anónimo. */
  async function as<T>(
    uid: string | null,
    fn: (tx: RawClient) => Promise<T>,
  ): Promise<T> {
    const claims = JSON.stringify(uid ? { sub: uid, role: "authenticated" } : {});
    const result = await sql.begin(async (tx) => {
      await tx`select set_config('request.jwt.claims', ${claims}, true)`;
      await tx.unsafe(`set local role ${uid ? "authenticated" : "anon"}`);
      return fn(tx as unknown as RawClient);
    });
    return result as T;
  }

  /** Intenta una escritura: que RLS la rechace o no afecte filas es lo mismo. */
  async function attempt(
    uid: string | null,
    fn: (tx: RawClient) => Promise<unknown>,
  ): Promise<void> {
    await as(uid, fn).catch(() => undefined);
  }

  async function seedBroadcast() {
    const [job] = await sql<{ id: string }[]>`
      insert into jobs (client_id, category_id, type, status, title, payment_method)
      values (${CLIENT}, ${CATEGORY}, 'urgent', 'broadcasting', 'Cerradura', 'cash')
      returning id`;
    await sql`insert into job_dispatch (job_id, provider_id, status)
              values (${job!.id}, ${PROVIDER}, 'notified')`;
    return job!.id;
  }

  async function seedAssigned(status = "in_progress") {
    const [job] = await sql<{ id: string }[]>`
      insert into jobs
        (client_id, provider_id, category_id, type, status, title, payment_method)
      values
        (${CLIENT}, ${PROVIDER}, ${CATEGORY}, 'scheduled', ${status}, 'Grifería', 'cash')
      returning id`;
    return job!.id;
  }

  // ── Escalada de privilegios ──
  it("un usuario no puede hacerse admin editando su perfil", async () => {
    await attempt(CLIENT, (tx) =>
      tx`update profiles set role = 'admin' where id = ${CLIENT}`,
    );
    const [row] = await sql<{ role: string }[]>`
      select role from profiles where id = ${CLIENT}`;
    expect(row!.role).toBe("client");
  });

  it("registrarse con role admin en los metadatos crea un cliente", async () => {
    const id = "33333333-3333-3333-3333-333333333333";
    await sql`insert into auth.users (id, raw_user_meta_data)
              values (${id}, ${sql.json({ role: "admin" })})`;
    const [row] = await sql<{ role: string }[]>`
      select role from profiles where id = ${id}`;
    expect(row!.role).toBe("client");
  });

  it("registrarse como provider sigue funcionando", async () => {
    const id = "44444444-4444-4444-4444-444444444444";
    await sql`insert into auth.users (id, raw_user_meta_data)
              values (${id}, ${sql.json({ role: "provider" })})`;
    const [row] = await sql<{ role: string }[]>`
      select role from profiles where id = ${id}`;
    expect(row!.role).toBe("provider");
    const pp = await sql`select 1 from provider_profiles where profile_id = ${id}`;
    expect(pp).toHaveLength(1);
  });

  it("un role inválido en los metadatos no rompe el registro", async () => {
    const id = "55555555-5555-5555-5555-555555555555";
    await sql`insert into auth.users (id, raw_user_meta_data)
              values (${id}, ${sql.json({ role: "superadmin" })})`;
    const [row] = await sql<{ role: string }[]>`
      select role from profiles where id = ${id}`;
    expect(row!.role).toBe("client");
  });

  // ── Saltear la verificación y el pago ──
  it("un profesional no puede aprobarse ni activarse el plan solo", async () => {
    await attempt(PROVIDER, (tx) =>
      tx`update provider_profiles
         set verification_status = 'approved', subscription_active = true,
             jobs_completed = 0, rating_avg = 5
         where profile_id = ${PROVIDER}`,
    );
    const [row] = await sql<{
      verification_status: string;
      subscription_active: boolean;
    }[]>`select verification_status, subscription_active
         from provider_profiles where profile_id = ${PROVIDER}`;
    expect(row!.verification_status).toBe("pending");
    expect(row!.subscription_active).toBe(false);
  });

  it("nadie puede escribir su propia suscripción", async () => {
    await attempt(CLIENT, (tx) =>
      tx`insert into subscriptions (profile_id, plan, status)
         values (${CLIENT}, 'client_monthly', 'active')`,
    );
    expect(await sql`select 1 from subscriptions`).toHaveLength(0);
  });

  // ── Pedidos ──
  it("un profesional no puede tomar una urgencia saltando la Server Action", async () => {
    const id = await seedBroadcast();
    await attempt(PROVIDER, (tx) =>
      tx`update jobs set status = 'accepted', provider_id = ${PROVIDER} where id = ${id}`,
    );
    const [row] = await sql<{ status: string }[]>`
      select status from jobs where id = ${id}`;
    expect(row!.status).toBe("broadcasting");
  });

  it("un profesional no puede darse de alta en el despacho de otro pedido", async () => {
    const [job] = await sql<{ id: string }[]>`
      insert into jobs (client_id, category_id, type, status, title, payment_method)
      values (${CLIENT}, ${CATEGORY}, 'urgent', 'broadcasting', 'Otro', 'cash')
      returning id`;
    await attempt(PROVIDER, (tx) =>
      tx`insert into job_dispatch (job_id, provider_id, status)
         values (${job!.id}, ${PROVIDER}, 'notified')`,
    );
    expect(await sql`select 1 from job_dispatch`).toHaveLength(0);
  });

  it("un cliente no puede marcar completado ni borrar su pedido", async () => {
    const id = await seedAssigned();
    await attempt(CLIENT, (tx) =>
      tx`update jobs set status = 'completed' where id = ${id}`,
    );
    await attempt(CLIENT, (tx) => tx`delete from jobs where id = ${id}`);
    const [row] = await sql<{ status: string }[]>`
      select status from jobs where id = ${id}`;
    expect(row!.status).toBe("in_progress");
  });

  // ── Reseñas y mensajes ──
  it("no se puede publicar una reseña falsa sin haber hecho el trabajo", async () => {
    await attempt(OTHER_CLIENT, (tx) =>
      tx`insert into reviews (job_id, author_id, target_id, rating)
         values (${CATEGORY}, ${OTHER_CLIENT}, ${PROVIDER}, 5)`,
    );
    expect(await sql`select 1 from reviews`).toHaveLength(0);
  });

  it("una parte no puede borrar el mensaje de la otra", async () => {
    const id = await seedAssigned();
    await sql`insert into messages (job_id, sender_id, body)
              values (${id}, ${PROVIDER}, 'Voy a las 10')`;
    await attempt(CLIENT, (tx) => tx`delete from messages where job_id = ${id}`);
    expect(await sql`select 1 from messages`).toHaveLength(1);
  });

  // ── Datos personales ──
  it("un visitante no puede leer teléfonos", async () => {
    const rows = await as(null, (tx) => tx`select phone from profiles`);
    expect(rows).toHaveLength(0);
  });

  it("un usuario no puede leer el teléfono de otro", async () => {
    const rows = await as(CLIENT, (tx) => tx`select id, phone from profiles`);
    expect(rows.map((r) => r.id)).toEqual([CLIENT]);
  });

  it("nadie más puede leer las rutas del DNI de un profesional", async () => {
    const rows = await as(OTHER_CLIENT, (tx) =>
      tx`select id_document_url from provider_profiles`,
    );
    expect(rows).toHaveLength(0);
  });

  // ── Lo que la app sí necesita desde el navegador ──
  it("cada usuario lee su rol (fallback del middleware)", async () => {
    const [row] = await as(CLIENT, (tx) =>
      tx`select role from profiles where id = ${CLIENT}`,
    );
    expect(row!.role).toBe("client");
  });

  it("el hook de JWT sigue leyendo el rol de cualquier usuario", async () => {
    const rows = await sql.begin(async (tx) => {
      await tx.unsafe("set local role supabase_auth_admin");
      return tx`select id from profiles`;
    });
    expect(rows).toHaveLength(3);
  });

  it("la campanita sigue marcando sus notificaciones como leídas", async () => {
    const [n] = await sql<{ id: string }[]>`
      insert into notifications (user_id, type, title)
      values (${CLIENT}, 'x', 'Hola') returning id`;
    await as(CLIENT, (tx) =>
      tx`update notifications set read_at = now() where id = ${n!.id}`,
    );
    const [row] = await sql<{ read_at: Date | null }[]>`
      select read_at from notifications where id = ${n!.id}`;
    expect(row!.read_at).not.toBeNull();
  });

  it("Realtime: el cliente lee su pedido", async () => {
    const id = await seedBroadcast();
    const rows = await as(CLIENT, (tx) => tx`select id from jobs where id = ${id}`);
    expect(rows).toHaveLength(1);
  });

  it("Realtime: el profesional notificado lee la urgencia y su despacho", async () => {
    const id = await seedBroadcast();
    const jobs = await as(PROVIDER, (tx) => tx`select id from jobs where id = ${id}`);
    const dispatch = await as(PROVIDER, (tx) =>
      tx`select job_id from job_dispatch where job_id = ${id}`,
    );
    expect(jobs).toHaveLength(1);
    expect(dispatch).toHaveLength(1);
  });

  it("Realtime: un ajeno no ve el pedido", async () => {
    const id = await seedBroadcast();
    const rows = await as(OTHER_CLIENT, (tx) =>
      tx`select id from jobs where id = ${id}`,
    );
    expect(rows).toHaveLength(0);
  });

  it("Realtime: las partes leen los mensajes y un ajeno no", async () => {
    const id = await seedAssigned();
    await sql`insert into messages (job_id, sender_id, body)
              values (${id}, ${PROVIDER}, 'Voy a las 10')`;
    expect(await as(CLIENT, (tx) => tx`select id from messages`)).toHaveLength(1);
    expect(await as(OTHER_CLIENT, (tx) => tx`select id from messages`)).toHaveLength(0);
  });
});
