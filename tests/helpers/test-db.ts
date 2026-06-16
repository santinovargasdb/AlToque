import postgres from "postgres";

/**
 * DB de test para los tests de integración del despacho urgente (Step 7).
 *
 * Se activa SOLO si `TEST_DATABASE_URL` está definido (DB dedicada y
 * descartable — NUNCA apuntar a producción: el setup hace DROP/TRUNCATE).
 * Si no está definido, los tests de integración se saltan (`describe.skipIf`)
 * y `pnpm test` sigue verde en cualquier entorno.
 *
 * El esquema de test NO usa PostGIS: `jobs.location` es `text` y se stubean
 * `st_makepoint`/`st_setsrid` para que el SQL crudo de `createJob` corra sin
 * la extensión. `acceptJob` (lo que de verdad queremos probar — race-safety)
 * nunca toca `location`, así que la fidelidad es total para ese camino.
 */

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
export const hasTestDb = !!TEST_DATABASE_URL;

export type RawClient = ReturnType<typeof postgres>;

/** Cliente Postgres crudo para setup/seed/asserts (separado del de la app). */
export function rawClient(): RawClient {
  if (!TEST_DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL no está definido");
  }
  return postgres(TEST_DATABASE_URL, {
    prepare: false,
    max: 5,
    onnotice: () => {}, // silencia los NOTICE de `drop ... if exists`
  });
}

/** Crea enums + tablas mínimas (jobs, job_dispatch) + stubs de PostGIS. */
export async function setupTestSchema(sql: RawClient): Promise<void> {
  await sql
    .unsafe(
      `
    drop table if exists job_dispatch cascade;
    drop table if exists jobs cascade;
    drop type if exists job_type cascade;
    drop type if exists job_status cascade;
    drop type if exists payment_method cascade;
    drop type if exists payment_status cascade;
    drop type if exists dispatch_status cascade;

    create type job_type as enum ('scheduled','urgent');
    create type job_status as enum
      ('requested','broadcasting','accepted','in_progress','completed','cancelled','expired');
    create type payment_method as enum ('cash','transfer','card');
    create type payment_status as enum
      ('none','pending','held','released','paid_cash','refunded');
    create type dispatch_status as enum ('notified','accepted','declined','expired');

    -- Stubs de PostGIS (DB de test sin la extensión): guardan un marcador.
    create or replace function st_makepoint(double precision, double precision)
      returns text language sql immutable as 'select ''POINT('' || $1 || '' '' || $2 || '')''';
    create or replace function st_setsrid(text, integer)
      returns text language sql immutable as 'select $1';

    create table jobs (
      id uuid primary key default gen_random_uuid(),
      client_id uuid not null,
      provider_id uuid,
      category_id uuid not null,
      type job_type not null,
      status job_status not null default 'requested',
      title text not null,
      description text,
      photos text[],
      address_text text,
      location text,
      scheduled_at timestamptz,
      payment_method payment_method not null,
      price_estimate numeric(12,2),
      final_price numeric(12,2),
      commission_rate numeric(4,3) not null,
      commission_amount numeric(12,2),
      payment_status payment_status not null default 'none',
      mp_preference_id text,
      mp_payment_id text,
      cancel_reason text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      accepted_at timestamptz,
      completed_at timestamptz
    );

    create table job_dispatch (
      id uuid primary key default gen_random_uuid(),
      job_id uuid not null references jobs(id) on delete cascade,
      provider_id uuid not null,
      status dispatch_status not null default 'notified',
      distance_km numeric,
      notified_at timestamptz not null default now(),
      responded_at timestamptz,
      unique (job_id, provider_id)
    );

    create table notifications (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null,
      type text not null,
      title text not null,
      body text,
      data jsonb,
      read_at timestamptz,
      created_at timestamptz not null default now()
    );

    create table push_subscriptions (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null,
      endpoint text not null unique,
      p256dh text not null,
      auth text not null,
      created_at timestamptz not null default now()
    );
  `,
    )
    .simple();
}

/** Limpia las tablas entre tests. */
export async function truncateAll(sql: RawClient): Promise<void> {
  await sql`truncate table job_dispatch, jobs, notifications, push_subscriptions
            restart identity cascade`;
}
