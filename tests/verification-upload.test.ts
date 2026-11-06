import { describe, it, expect } from "vitest";
import {
  MAX_VERIFICATION_UPLOAD_BYTES,
  verificationUploadError,
} from "@/lib/validations/provider";

/** El envío completo tiene que entrar en el límite de cuerpo de Vercel (4,5 MB). */
describe("verificationUploadError", () => {
  const MB = 1024 * 1024;

  it("deja margen bajo el límite de 4,5 MB de Vercel", () => {
    expect(MAX_VERIFICATION_UPLOAD_BYTES).toBeLessThan(4.5 * MB);
  });

  it("acepta un envío que entra en el límite", () => {
    expect(verificationUploadError([MB, MB, MB])).toBeNull();
  });

  it("acepta un envío justo en el límite", () => {
    expect(verificationUploadError([MAX_VERIFICATION_UPLOAD_BYTES])).toBeNull();
  });

  it("rechaza con un mensaje claro si la suma se pasa", () => {
    const error = verificationUploadError([2 * MB, 2 * MB, MB]);
    expect(error).toMatch(/4 MB/);
  });
});
