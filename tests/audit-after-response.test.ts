import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * En Vercel, lo que queda colgando después de la respuesta se puede cortar: la
 * auditoría y las alertas se agendan con `after()` para que no se pierdan.
 */

const { after, insertValues, sendEmail } = vi.hoisted(() => ({
  after: vi.fn(),
  insertValues: vi.fn(async (_values: Record<string, unknown>) => {}),
  sendEmail: vi.fn(async () => true),
}));

vi.mock("next/server", () => ({ after }));
vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({ "x-forwarded-for": "1.2.3.4", "user-agent": "Test" }),
}));
vi.mock("@/lib/db", () => ({
  db: { insert: () => ({ values: insertValues }) },
}));
vi.mock("@/lib/emails/send", () => ({ sendEmail }));

import { logSecurityEvent } from "@/lib/audit";
import { sendSecurityAlert } from "@/lib/emails/security-events";

/** Corre lo que quedó agendado, como hace Next al terminar la respuesta. */
async function runScheduled() {
  for (const [task] of after.mock.calls) await task();
}

describe("auditoría después de la respuesta", () => {
  beforeEach(() => {
    after.mockReset();
    insertValues.mockClear();
    sendEmail.mockClear();
  });

  it("logSecurityEvent se agenda y escribe al terminar la respuesta", async () => {
    logSecurityEvent("login", { userId: "u1", metadata: { method: "password" } });
    await new Promise((resolve) => setTimeout(resolve));

    expect(after).toHaveBeenCalledTimes(1);
    expect(insertValues).not.toHaveBeenCalled();

    await runScheduled();

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        action: "login",
        ipAddress: "1.2.3.4",
        userAgent: "Test",
      }),
    );
  });

  it("un fallo al escribir no rompe el flujo", async () => {
    insertValues.mockRejectedValueOnce(new Error("sin base"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    logSecurityEvent("login");

    await expect(runScheduled()).resolves.toBeUndefined();
    consoleError.mockRestore();
  });

  it("fuera de una request corre igual, sin agendar", async () => {
    after.mockImplementation(() => {
      throw new Error("`after` was called outside a request scope");
    });

    logSecurityEvent("logout", { userId: "u1" });
    await vi.waitFor(() => expect(insertValues).toHaveBeenCalledTimes(1));
  });

  it("sendSecurityAlert se agenda y manda el email al terminar", async () => {
    sendSecurityAlert({ to: "a@b.com", name: "Ana", eventLabel: "un login" });
    await new Promise((resolve) => setTimeout(resolve));

    expect(after).toHaveBeenCalledTimes(1);
    expect(sendEmail).not.toHaveBeenCalled();

    await runScheduled();

    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});
