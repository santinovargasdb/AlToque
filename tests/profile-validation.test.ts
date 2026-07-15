import { describe, it, expect } from "vitest";
import {
  updateAvatarSchema,
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TO_EXT,
} from "@/lib/validations/profile";

const UID = "123e4567-e89b-12d3-a456-426614174000";

describe("updateAvatarSchema · path del avatar", () => {
  it("acepta el path canónico {uuid}/avatar-{ts}.{ext}", () => {
    for (const ext of ["png", "jpg", "webp", "gif", "avif"]) {
      const r = updateAvatarSchema.safeParse({
        path: `${UID}/avatar-1752585600000.${ext}`,
      });
      expect(r.success).toBe(true);
    }
  });

  it.each([
    ["path traversal", `${UID}/../otro/avatar-1.png`],
    ["subcarpetas", `${UID}/sub/avatar-1.png`],
    ["carpeta que no es uuid", "evil/avatar-1.png"],
    ["extensión svg (riesgo XSS)", `${UID}/avatar-1.svg`],
    ["nombre arbitrario", `${UID}/malware.exe`],
    ["vacío", ""],
  ])("rechaza %s", (_label, path) => {
    expect(updateAvatarSchema.safeParse({ path }).success).toBe(false);
  });
});

describe("constantes del avatar (contrato front ↔ bucket)", () => {
  it("el máximo es 2 MB (igual que file_size_limit del bucket)", () => {
    expect(AVATAR_MAX_BYTES).toBe(2 * 1024 * 1024);
  });

  it("solo admite formatos raster (sin SVG)", () => {
    expect(Object.keys(AVATAR_MIME_TO_EXT)).not.toContain("image/svg+xml");
    // Toda extensión del mapa está permitida por el regex del schema.
    for (const ext of Object.values(AVATAR_MIME_TO_EXT)) {
      const r = updateAvatarSchema.safeParse({
        path: `${UID}/avatar-1.${ext}`,
      });
      expect(r.success).toBe(true);
    }
  });
});
