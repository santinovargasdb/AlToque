/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

/** Qué rutas exige el middleware según la sesión. */

const { updateSession } = vi.hoisted(() => ({ updateSession: vi.fn() }));
vi.mock("@/lib/supabase/middleware", () => ({ updateSession }));

import { middleware } from "@/middleware";

function jwtWithRole(role: string): string {
  return `h.${btoa(JSON.stringify({ user_role: role }))}.s`;
}

function mockSession(role: string | null) {
  updateSession.mockResolvedValue({
    response: NextResponse.next(),
    user: role ? { id: "u1" } : null,
    supabase: {
      auth: {
        getSession: async () => ({
          data: { session: role ? { access_token: jwtWithRole(role) } : null },
        }),
      },
    },
  });
}

async function visit(path: string) {
  const res = await middleware(new NextRequest(`https://altoque.test${path}`));
  return res.headers.get("location");
}

describe("middleware", () => {
  beforeEach(() => updateSession.mockReset());

  it("el perfil del profesional es público para un visitante", async () => {
    mockSession(null);
    expect(await visit("/profesional/abc")).toBeNull();
  });

  it("un profesional también puede ver un perfil público", async () => {
    mockSession("provider");
    expect(await visit("/profesional/abc")).toBeNull();
  });

  it("la zona cliente sigue exigiendo sesión", async () => {
    mockSession(null);
    expect(await visit("/pedidos")).toContain("/ingresar");
  });

  it("la zona profesional sigue rechazando a un cliente", async () => {
    mockSession("client");
    expect(await visit("/pro/inicio")).toContain("/inicio");
  });
});
