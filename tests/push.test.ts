import { describe, it, expect, beforeEach, vi } from "vitest";
import { urlBase64ToUint8Array } from "@/lib/push/vapid";
import { pushSubscriptionSchema } from "@/lib/validations/push";

// Mocks para sendPushToUsers: web-push y el cliente DB.
const h = vi.hoisted(() => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
  selectRows: vi.fn(),
  deleteWhere: vi.fn(),
}));
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: h.setVapidDetails,
    sendNotification: h.sendNotification,
  },
}));
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => h.selectRows() }) }),
    delete: () => ({ where: h.deleteWhere }),
  },
}));

describe("urlBase64ToUint8Array", () => {
  it("decodifica base64 estándar a bytes", () => {
    expect(Array.from(urlBase64ToUint8Array("AQID"))).toEqual([1, 2, 3]);
  });

  it("maneja caracteres url-safe (-, _) y padding faltante", () => {
    // base64url "-_8" → base64 "+/8=" → bytes [251, 255]
    expect(Array.from(urlBase64ToUint8Array("-_8"))).toEqual([251, 255]);
  });
});

describe("pushSubscriptionSchema", () => {
  it("acepta una suscripción válida y descarta claves extra", () => {
    const parsed = pushSubscriptionSchema.parse({
      endpoint: "https://fcm.example/abc",
      expirationTime: null,
      keys: { p256dh: "x", auth: "y" },
    });
    expect(parsed).toEqual({
      endpoint: "https://fcm.example/abc",
      keys: { p256dh: "x", auth: "y" },
    });
  });

  it("rechaza endpoint inválido o claves vacías", () => {
    expect(
      pushSubscriptionSchema.safeParse({
        endpoint: "no-es-url",
        keys: { p256dh: "x", auth: "y" },
      }).success,
    ).toBe(false);
    expect(
      pushSubscriptionSchema.safeParse({
        endpoint: "https://x.y",
        keys: { p256dh: "", auth: "y" },
      }).success,
    ).toBe(false);
  });
});

describe("sendPushToUsers", () => {
  beforeEach(() => {
    vi.resetModules();
    h.setVapidDetails.mockReset();
    h.sendNotification.mockReset();
    h.selectRows.mockReset();
    h.deleteWhere.mockReset().mockResolvedValue(undefined);
  });

  it("es no-op (ni toca la DB) si faltan las claves VAPID", async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    const { sendPushToUsers } = await import("@/lib/push/send");

    await sendPushToUsers(["u1"], { title: "t", body: "b" });

    expect(h.selectRows).not.toHaveBeenCalled();
    expect(h.sendNotification).not.toHaveBeenCalled();
  });

  it("envía una notificación por suscripción con el payload serializado", async () => {
    process.env.VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    h.selectRows.mockResolvedValue([
      { id: "s1", endpoint: "https://a", p256dh: "p", auth: "a" },
      { id: "s2", endpoint: "https://b", p256dh: "p", auth: "a" },
    ]);
    h.sendNotification.mockResolvedValue(undefined);
    const { sendPushToUsers } = await import("@/lib/push/send");

    await sendPushToUsers(["u1"], { title: "Hola", body: "Mundo", url: "/x" });

    expect(h.sendNotification).toHaveBeenCalledTimes(2);
    const payload = h.sendNotification.mock.calls[0]?.[1] as string;
    expect(JSON.parse(payload)).toMatchObject({
      title: "Hola",
      body: "Mundo",
      url: "/x",
    });
    expect(h.deleteWhere).not.toHaveBeenCalled();
  });

  it("borra las suscripciones muertas (410 Gone)", async () => {
    process.env.VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    h.selectRows.mockResolvedValue([
      { id: "dead", endpoint: "https://a", p256dh: "p", auth: "a" },
    ]);
    h.sendNotification.mockRejectedValue({ statusCode: 410 });
    const { sendPushToUsers } = await import("@/lib/push/send");

    await sendPushToUsers(["u1"], { title: "t", body: "b" });

    expect(h.deleteWhere).toHaveBeenCalledTimes(1);
  });
});
