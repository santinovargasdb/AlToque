// @vitest-environment node
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import type { NextRequest } from "next/server";
import {
  emailSchema,
  passwordSchema,
  signUpSchema,
  authCallbackParamsSchema,
  completeProfileSchema,
  PASSWORD_RULES,
} from "@/lib/validations/auth";
import { GET as authCallbackGET } from "@/app/auth/callback/route";

/* ── Mocks del callback: Supabase (sesión) y Drizzle (promoción de rol) ──
   Permiten testear el handler real de /auth/callback sin red ni DB. */

const supa = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
  getUser: vi.fn(),
  refreshSession: vi.fn(),
}));

const dbSpy = vi.hoisted(() => ({
  selectLimit: vi.fn(),
  txUpdateWhere: vi.fn(),
  txInsertConflict: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: supa }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: dbSpy.selectLimit }) }),
    }),
    transaction: async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        update: () => ({ set: () => ({ where: dbSpy.txUpdateWhere }) }),
        insert: () => ({
          values: () => ({ onConflictDoNothing: dbSpy.txInsertConflict }),
        }),
      }),
  },
}));

/** Request mínima para el route handler (nextUrl + headers es lo que usa). */
function makeRequest(url: string): NextRequest {
  return {
    nextUrl: new URL(url),
    headers: new Headers(),
  } as unknown as NextRequest;
}

/** Location de la redirección devuelta, parseada. */
function redirectedTo(res: Response): URL {
  const location = res.headers.get("location");
  expect(location).toBeTruthy();
  return new URL(location!);
}

describe("emailSchema · formato estricto", () => {
  it.each([
    "usuario@dominio.com",
    "nombre.apellido+tag@sub.dominio.com.ar",
    "USER@DOMINIO.COM",
  ])("acepta %s", (email) => {
    expect(emailSchema.safeParse(email).success).toBe(true);
  });

  it("normaliza a minúsculas y trimea", () => {
    const r = emailSchema.safeParse("  Usuario@Dominio.COM  ");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("usuario@dominio.com");
  });

  it.each([
    "",
    "sinArroba.com",
    "user@localhost",
    "a@b",
    "user@dominio",
    "user @dominio.com",
    "user@@dominio.com",
    "user@dominio..com",
  ])("rechaza %j", (email) => {
    expect(emailSchema.safeParse(email).success).toBe(false);
  });
});

describe("passwordSchema · reglas estrictas", () => {
  it("acepta una contraseña con letras, números y especial (8+)", () => {
    expect(passwordSchema.safeParse("Segura#2026").success).toBe(true);
  });

  it.each([
    ["corta", "aB1#"],
    ["sin número", "SinNumeros#!"],
    ["sin letra", "12345678#!"],
    ["sin especial", "SoloLetras123"],
  ])("rechaza contraseña %s", (_label, pw) => {
    expect(passwordSchema.safeParse(pw).success).toBe(false);
  });

  it("rechaza más de 72 caracteres (límite de bcrypt)", () => {
    expect(passwordSchema.safeParse(`aA1#${"x".repeat(72)}`).success).toBe(
      false,
    );
  });

  it("PASSWORD_RULES y el schema evalúan igual", () => {
    const pw = "Segura#2026";
    expect(PASSWORD_RULES.every((r) => r.test(pw))).toBe(
      passwordSchema.safeParse(pw).success,
    );
  });
});

describe("signUpSchema", () => {
  const base = {
    role: "client" as const,
    fullName: "Juan Pérez",
    phone: "11 2345 6789",
    email: "juan@dominio.com",
    password: "Segura#2026",
    confirmPassword: "Segura#2026",
  };

  it("acepta un registro válido", () => {
    expect(signUpSchema.safeParse(base).success).toBe(true);
  });

  it("rechaza contraseñas que no coinciden", () => {
    const r = signUpSchema.safeParse({ ...base, confirmPassword: "Otra#123" });
    expect(r.success).toBe(false);
  });

  it("rechaza teléfono con caracteres inválidos", () => {
    const r = signUpSchema.safeParse({ ...base, phone: "abc123" });
    expect(r.success).toBe(false);
  });

  it("rechaza redirectTo externo (open redirect)", () => {
    const r = signUpSchema.safeParse({
      ...base,
      redirectTo: "//evil.com/phishing",
    });
    expect(r.success).toBe(false);
  });

  it("acepta redirectTo interno", () => {
    const r = signUpSchema.safeParse({ ...base, redirectTo: "/pro/inicio" });
    expect(r.success).toBe(true);
  });
});

describe("authCallbackParamsSchema · params de /auth/callback (OAuth)", () => {
  it("acepta next interno y role válido", () => {
    const r = authCallbackParamsSchema.parse({
      next: "/pro/inicio",
      role: "provider",
    });
    expect(r).toEqual({ next: "/pro/inicio", role: "provider" });
  });

  it("degrada un next externo (open redirect) a /inicio", () => {
    const r = authCallbackParamsSchema.parse({
      next: "//evil.com/phishing",
      role: null,
    });
    expect(r.next).toBe("/inicio");
  });

  it("degrada un next absoluto (https://…) a /inicio", () => {
    const r = authCallbackParamsSchema.parse({
      next: "https://evil.com",
      role: null,
    });
    expect(r.next).toBe("/inicio");
  });

  it("degrada un role desconocido a null (no escala privilegios)", () => {
    const r = authCallbackParamsSchema.parse({
      next: "/inicio",
      role: "admin",
    });
    expect(r.role).toBeNull();
  });
});

describe("completeProfileSchema · onboarding", () => {
  it("acepta nombre y teléfono válidos", () => {
    const r = completeProfileSchema.safeParse({
      fullName: "Juan Pérez",
      phone: "11 2345 6789",
    });
    expect(r.success).toBe(true);
  });

  it.each([
    ["sin teléfono", { fullName: "Juan Pérez", phone: "" }],
    ["teléfono inválido", { fullName: "Juan Pérez", phone: "abc" }],
    ["sin nombre", { fullName: "", phone: "11 2345 6789" }],
  ])("rechaza %s", (_label, input) => {
    expect(completeProfileSchema.safeParse(input).success).toBe(false);
  });
});

describe("GET /auth/callback · integración (edge cases de Google OAuth)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Los caminos de error loggean con logAuthError → silenciamos la consola.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("cancelación manual en Google → mensaje amigable sin tocar la sesión", async () => {
    const res = await authCallbackGET(
      makeRequest(
        "http://localhost:3000/auth/callback?error=access_denied&error_description=User+denied+access",
      ),
    );

    const loc = redirectedTo(res);
    expect(loc.pathname).toBe("/ingresar");
    expect(loc.searchParams.get("error")).toBe(
      "Cancelaste el ingreso con Google. Probá de nuevo.",
    );
    // La sesión no se toca: no hubo intercambio de código ni escritura en DB.
    expect(supa.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(dbSpy.txUpdateWhere).not.toHaveBeenCalled();
  });

  it("fallo del intercambio (código inválido) → redirección limpia a /ingresar", async () => {
    supa.exchangeCodeForSession.mockResolvedValue({
      error: { message: "invalid code" },
    });

    const res = await authCallbackGET(
      makeRequest("http://localhost:3000/auth/callback?code=xyz&next=/inicio"),
    );

    const loc = redirectedTo(res);
    expect(loc.pathname).toBe("/ingresar");
    expect(loc.searchParams.get("error")).toBe(
      "No se pudo verificar el enlace",
    );
  });

  it("timeout inesperado de Supabase (throw) → no explota, redirección limpia", async () => {
    supa.exchangeCodeForSession.mockRejectedValue(
      new Error("fetch failed: connect ETIMEDOUT"),
    );

    const res = await authCallbackGET(
      makeRequest("http://localhost:3000/auth/callback?code=xyz&next=/inicio"),
    );

    const loc = redirectedTo(res);
    expect(loc.pathname).toBe("/ingresar");
    expect(loc.searchParams.get("error")).toBe(
      "No se pudo verificar el enlace",
    );
    expect(dbSpy.txUpdateWhere).not.toHaveBeenCalled();
  });

  it("email ya registrado con contraseña que entra con Google (vinculación automática) → conserva su rol", async () => {
    supa.exchangeCodeForSession.mockResolvedValue({ error: null });
    // Cuenta EXISTENTE (creada hace meses): la vinculación de identidades la
    // hace Supabase por email verificado; nuestra capa NO debe tocar el rol
    // aunque venga ?role=provider (ej. entró por la pantalla de registro pro).
    supa.getUser.mockResolvedValue({
      data: { user: { id: "user-1", created_at: "2026-01-01T00:00:00.000Z" } },
    });

    const res = await authCallbackGET(
      makeRequest(
        "http://localhost:3000/auth/callback?code=xyz&next=/pro/inicio&role=provider",
      ),
    );

    // Redirige (el middleware luego enruta por el rol real)…
    expect(redirectedTo(res).pathname).toBe("/pro/inicio");
    // …pero NO promueve ni refresca: la cuenta existente queda intacta.
    expect(dbSpy.selectLimit).not.toHaveBeenCalled();
    expect(dbSpy.txUpdateWhere).not.toHaveBeenCalled();
    expect(supa.refreshSession).not.toHaveBeenCalled();
  });

  it("signup NUEVO vía Google con role=provider → promueve y re-emite el JWT", async () => {
    supa.exchangeCodeForSession.mockResolvedValue({ error: null });
    supa.getUser.mockResolvedValue({
      data: { user: { id: "user-2", created_at: new Date().toISOString() } },
    });
    dbSpy.selectLimit.mockResolvedValue([{ role: "client" }]);
    supa.refreshSession.mockResolvedValue({ error: null });

    const res = await authCallbackGET(
      makeRequest(
        "http://localhost:3000/auth/callback?code=xyz&next=/pro/inicio&role=provider",
      ),
    );

    expect(redirectedTo(res).pathname).toBe("/pro/inicio");
    expect(dbSpy.txUpdateWhere).toHaveBeenCalledTimes(1); // profiles.role
    expect(dbSpy.txInsertConflict).toHaveBeenCalledTimes(1); // provider_profiles
    expect(supa.refreshSession).toHaveBeenCalledTimes(1); // claim user_role
  });

  it("signup nuevo SIN role=provider → no toca el rol", async () => {
    supa.exchangeCodeForSession.mockResolvedValue({ error: null });
    supa.getUser.mockResolvedValue({
      data: { user: { id: "user-3", created_at: new Date().toISOString() } },
    });

    const res = await authCallbackGET(
      makeRequest("http://localhost:3000/auth/callback?code=xyz&next=/inicio"),
    );

    expect(redirectedTo(res).pathname).toBe("/inicio");
    expect(supa.getUser).not.toHaveBeenCalled();
    expect(dbSpy.txUpdateWhere).not.toHaveBeenCalled();
  });
});
