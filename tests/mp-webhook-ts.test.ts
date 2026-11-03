// @vitest-environment node
import { describe, expect, it } from "vitest";
import { signatureDriftSeconds } from "@/lib/mercadopago/webhook";

const NOW_MS = 1_793_748_548_000;

describe("signatureDriftSeconds", () => {
  it("acepta ts en milisegundos", () => {
    expect(signatureDriftSeconds(`ts=${NOW_MS - 2_000},v1=abc`, NOW_MS)).toBe(2);
  });

  it("acepta ts en segundos", () => {
    const tsSeconds = Math.floor(NOW_MS / 1000) - 3;
    expect(signatureDriftSeconds(`ts=${tsSeconds},v1=abc`, NOW_MS)).toBe(3);
  });

  it("encuentra ts aunque no sea la primera parte del header", () => {
    expect(signatureDriftSeconds(`v1=abc, ts=${NOW_MS}`, NOW_MS)).toBe(0);
  });

  it("devuelve una deriva grande para un ts viejo (anti-replay)", () => {
    const anHourAgo = Math.floor(NOW_MS / 1000) - 3600;
    expect(signatureDriftSeconds(`ts=${anHourAgo},v1=abc`, NOW_MS)).toBe(3600);
  });

  it("devuelve null sin ts numérico", () => {
    expect(signatureDriftSeconds("v1=abc", NOW_MS)).toBeNull();
    expect(signatureDriftSeconds(null, NOW_MS)).toBeNull();
  });
});
