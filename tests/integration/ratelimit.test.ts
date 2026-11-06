import { readFileSync } from "node:fs";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { hasTestDb, rawClient, type RawClient } from "../helpers/test-db";

/**
 * Límite de intentos: cambiar de IP no reinicia el contador de un email, y
 * probar muchos emails desde una IP tampoco esquiva el límite.
 *
 * Requieren `TEST_DATABASE_URL`; si no está, el bloque se salta.
 */

const CFG = { limit: 2, windowMinutes: 15 };

describe.skipIf(!hasTestDb)("límite de intentos (integración)", () => {
  let sql: RawClient;
  let allowAttempt: typeof import("@/lib/ratelimit").allowAttempt;
  let purgeExpiredRateLimits: typeof import("@/lib/ratelimit").purgeExpiredRateLimits;

  beforeAll(async () => {
    sql = rawClient();
    await sql.unsafe(readFileSync("drizzle/rate-limits.sql", "utf8")).simple();
    ({ allowAttempt, purgeExpiredRateLimits } = await import("@/lib/ratelimit"));
  });

  afterAll(async () => {
    await sql`drop table if exists rate_limits`;
    await sql.end();
  });

  beforeEach(async () => {
    await sql`truncate table rate_limits`;
  });

  async function repeat(times: number, fn: (i: number) => Promise<boolean>) {
    const results: boolean[] = [];
    for (let i = 0; i < times; i++) results.push(await fn(i));
    return results;
  }

  it("corta los reintentos desde la misma IP y el mismo email", async () => {
    const results = await repeat(3, () =>
      allowAttempt("login", CFG, "1.1.1.1", "ana@test.com"),
    );
    expect(results).toEqual([true, true, false]);
  });

  it("cambiar de IP no reinicia el contador del email", async () => {
    const results = await repeat(5, (i) =>
      allowAttempt("login", CFG, `1.1.1.${i}`, "ana@test.com"),
    );
    expect(results).toEqual([true, true, true, true, false]);
  });

  it("probar muchos emails desde una IP termina cortándose", async () => {
    const results = await repeat(11, (i) =>
      allowAttempt("login", CFG, "1.1.1.1", `user${i}@test.com`),
    );
    expect(results.slice(0, 10).every(Boolean)).toBe(true);
    expect(results[10]).toBe(false);
  });

  it("el email cuenta igual con mayúsculas", async () => {
    const results = await repeat(5, (i) =>
      allowAttempt("login", CFG, `1.1.1.${i}`, i % 2 ? "ANA@test.com" : "ana@test.com"),
    );
    expect(results[4]).toBe(false);
  });

  it("una acción no consume el límite de otra", async () => {
    await repeat(3, () => allowAttempt("login", CFG, "1.1.1.1", "ana@test.com"));
    expect(await allowAttempt("reset", CFG, "1.1.1.1", "ana@test.com")).toBe(true);
  });

  it("purgeExpiredRateLimits borra solo lo vencido", async () => {
    await sql`insert into rate_limits (id, count, expires_at) values
      ('vieja', 1, now() - interval '1 minute'),
      ('vigente', 1, now() + interval '1 minute')`;

    expect(await purgeExpiredRateLimits()).toBe(1);

    const rows = await sql<{ id: string }[]>`select id from rate_limits`;
    expect(rows.map((r) => r.id)).toEqual(["vigente"]);
  });
});
