import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

/**
 * Drizzle aplica solo las migraciones con fecha posterior a la última registrada.
 * Una fecha fuera de orden no da error: `db:migrate` informa éxito y la saltea.
 */
describe("journal de migraciones", () => {
  it("las fechas son estrictamente crecientes", () => {
    const journal = JSON.parse(
      readFileSync("drizzle/migrations/meta/_journal.json", "utf8"),
    ) as { entries: { tag: string; when: number }[] };

    const outOfOrder = journal.entries
      .filter((entry, i) => i > 0 && entry.when <= journal.entries[i - 1]!.when)
      .map((entry) => entry.tag);

    expect(outOfOrder).toEqual([]);
  });
});
