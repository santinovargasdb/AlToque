import { describe, it, expect } from "vitest";
import {
  PROVIDER_ASPECTS,
  CLIENT_ASPECTS,
  ALL_ASPECT_KEYS,
  aspectKeysFor,
  generalFromAspects,
  aspectLabel,
} from "@/lib/reviews/aspects";

describe("aspects · fuente central", () => {
  it("tiene 4 aspectos por dirección y 8 claves únicas en total", () => {
    expect(PROVIDER_ASPECTS).toHaveLength(4);
    expect(CLIENT_ASPECTS).toHaveLength(4);
    expect(new Set(ALL_ASPECT_KEYS).size).toBe(8);
  });

  it("aspectKeysFor devuelve las claves de la dirección", () => {
    expect(aspectKeysFor("client_to_provider")).toEqual([
      "punctuality",
      "quality",
      "communication",
      "price",
    ]);
    expect(aspectKeysFor("provider_to_client")).toEqual([
      "respect",
      "availability",
      "clarity",
      "payment",
    ]);
  });

  it("aspectLabel resuelve la etiqueta de una clave", () => {
    expect(aspectLabel("quality")).toBe("Calidad del trabajo");
  });
});

describe("generalFromAspects · promedio a 1 decimal", () => {
  it("promedia y redondea a 1 decimal", () => {
    expect(generalFromAspects([5, 4, 4, 4])).toBe(4.3); // 17/4 = 4.25 → 4.3
    expect(generalFromAspects([5, 5, 5, 5])).toBe(5);
    expect(generalFromAspects([3, 4, 2, 5])).toBe(3.5);
  });
});
