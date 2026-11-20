import { describe, it, expect } from "vitest";
import { parseAssetLinksConfig } from "@/lib/android/asset-links";

const FP = Array.from({ length: 32 }, (_, i) =>
  i.toString(16).padStart(2, "0").toUpperCase(),
).join(":");

describe("parseAssetLinksConfig", () => {
  it("acepta paquete y huella válidos", () => {
    expect(parseAssetLinksConfig("app.altoque.twa", FP)).toEqual({
      packageName: "app.altoque.twa",
      fingerprints: [FP],
    });
  });

  it("acepta varias huellas separadas por coma y normaliza mayúsculas", () => {
    const res = parseAssetLinksConfig(
      "app.altoque.twa",
      `${FP.toLowerCase()}, ${FP}`,
    );
    expect(res?.fingerprints).toEqual([FP, FP]);
  });

  it("devuelve null si falta alguna variable", () => {
    expect(parseAssetLinksConfig(undefined, FP)).toBeNull();
    expect(parseAssetLinksConfig("app.altoque.twa", undefined)).toBeNull();
    expect(parseAssetLinksConfig("app.altoque.twa", "")).toBeNull();
  });

  it("rechaza valores con formato inválido", () => {
    expect(parseAssetLinksConfig("altoque", FP)).toBeNull();
    expect(parseAssetLinksConfig("app.altoque.twa", "AA:BB")).toBeNull();
    expect(parseAssetLinksConfig("app.altoque.twa", `${FP},no-es-huella`)).toBeNull();
  });
});
