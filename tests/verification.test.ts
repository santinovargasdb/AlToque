import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

/**
 * Verificación de identidad ampliada: DNI frente+dorso, matrícula
 * condicional por oficio regulado, motivo de rechazo y notificación
 * del resultado al profesional.
 */

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));

const updateSet = vi.fn();
const updateWhere = vi.fn().mockResolvedValue(undefined);
const insertValues = vi.fn().mockResolvedValue(undefined);
const selectRows: unknown[] = [];

vi.mock("@/lib/db", () => ({
  db: {
    update: () => ({
      set: (values: unknown) => {
        updateSet(values);
        return { where: updateWhere };
      },
    }),
    insert: () => ({ values: insertValues }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => selectRows,
        }),
      }),
    }),
  },
}));

vi.mock("@/lib/push/send", () => ({
  sendPushToUsers: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/emails/send", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

const getUserById = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    auth: { admin: { getUserById } },
  }),
}));

const notifyVerificationResult = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/notifications/verification", async (importOriginal) => {
  // Los tests del propio módulo usan la implementación real; los de las
  // actions de admin assertean sobre este spy.
  const real = await importOriginal<
    typeof import("@/lib/notifications/verification")
  >();
  return {
    realNotifyVerificationResult: real.notifyVerificationResult,
    notifyVerificationResult,
  };
});

import {
  requiresLicense,
  rejectionReasonSchema,
  validateVerificationFiles,
  REGULATED_TRADE_SLUGS,
} from "@/lib/validations/provider";
import { verificationResultEmail } from "@/lib/emails/verification-result";
import { getSession } from "@/lib/auth";
import { sendPushToUsers } from "@/lib/push/send";
import { sendEmail } from "@/lib/emails/send";

const PROVIDER_ID = "a3bb189e-8bf9-4888-9912-ace4e6543002";

function makeFile(
  name = "doc.jpg",
  type = "image/jpeg",
  bytes = 1024,
): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

beforeEach(() => {
  vi.clearAllMocks();
  selectRows.length = 0;
});

describe("requiresLicense · oficios regulados exigen matrícula", () => {
  it("gasista y electricista son oficios regulados", () => {
    expect(REGULATED_TRADE_SLUGS).toContain("gasista");
    expect(REGULATED_TRADE_SLUGS).toContain("electricista");
  });

  it("true si algún oficio del profesional es regulado", () => {
    expect(requiresLicense(["plomeria", "gasista"])).toBe(true);
    expect(requiresLicense(["electricista"])).toBe(true);
  });

  it("false sin oficios regulados o sin oficios", () => {
    expect(requiresLicense(["plomeria", "pintor"])).toBe(false);
    expect(requiresLicense([])).toBe(false);
  });
});

describe("rejectionReasonSchema · motivo de rechazo", () => {
  it("acepta un motivo normal y lo trimea", () => {
    const r = rejectionReasonSchema.safeParse("  La foto del DNI está borrosa  ");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("La foto del DNI está borrosa");
  });

  it("rechaza motivos vacíos o demasiado cortos", () => {
    expect(rejectionReasonSchema.safeParse("").success).toBe(false);
    expect(rejectionReasonSchema.safeParse("mal").success).toBe(false);
  });

  it("rechaza motivos de más de 500 caracteres", () => {
    expect(rejectionReasonSchema.safeParse("x".repeat(501)).success).toBe(false);
  });
});

describe("validateVerificationFiles · set completo de documentos", () => {
  const base = {
    dniFront: makeFile("frente.jpg"),
    dniBack: makeFile("dorso.jpg"),
    selfie: makeFile("selfie.jpg"),
    license: null,
  };

  it("acepta DNI frente + dorso + selfie sin matrícula cuando no es exigida", () => {
    expect(validateVerificationFiles(base, { licenseRequired: false })).toBeNull();
  });

  it("exige el dorso del DNI", () => {
    const err = validateVerificationFiles(
      { ...base, dniBack: null },
      { licenseRequired: false },
    );
    expect(err).toMatch(/dorso/i);
  });

  it("exige matrícula cuando el oficio la requiere", () => {
    const err = validateVerificationFiles(base, { licenseRequired: true });
    expect(err).toMatch(/matrícula/i);
  });

  it("acepta el set completo con matrícula", () => {
    const err = validateVerificationFiles(
      { ...base, license: makeFile("matricula.pdf", "application/pdf") },
      { licenseRequired: true },
    );
    expect(err).toBeNull();
  });

  it("rechaza tipos de archivo no permitidos", () => {
    const err = validateVerificationFiles(
      { ...base, selfie: makeFile("selfie.gif", "image/gif") },
      { licenseRequired: false },
    );
    expect(err).toMatch(/JPG|PNG|WEBP|PDF/i);
  });

  it("rechaza archivos de más de 6 MB", () => {
    const err = validateVerificationFiles(
      { ...base, dniFront: makeFile("frente.jpg", "image/jpeg", 6 * 1024 * 1024 + 1) },
      { licenseRequired: false },
    );
    expect(err).toMatch(/6 MB/i);
  });
});

describe("verificationResultEmail · template del resultado", () => {
  it("aprobado: celebra y linkea al panel del profesional", () => {
    const { subject, html } = verificationResultEmail({
      name: "Rodrigo",
      status: "approved",
      appUrl: "https://altoque.app",
    });
    expect(subject).toMatch(/aprobada/i);
    expect(html).toContain("Rodrigo");
    expect(html).toContain("https://altoque.app/pro/inicio");
  });

  it("rechazado: incluye el motivo y linkea a re-enviar documentos", () => {
    const { subject, html } = verificationResultEmail({
      name: "Rodrigo",
      status: "rejected",
      reason: "La foto del DNI está borrosa",
      appUrl: "https://altoque.app",
    });
    expect(subject).toMatch(/rechazada|revisar/i);
    expect(html).toContain("La foto del DNI está borrosa");
    expect(html).toContain("https://altoque.app/pro/verificacion");
  });
});

describe("notifyVerificationResult · in-app + push + email", () => {
  async function callReal(params: {
    providerId: string;
    status: "approved" | "rejected";
    reason?: string;
  }) {
    const mod = (await import("@/lib/notifications/verification")) as unknown as {
      realNotifyVerificationResult: (p: typeof params) => Promise<void>;
    };
    return mod.realNotifyVerificationResult(params);
  }

  it("aprobado: inserta notificación in-app y manda push al profesional", async () => {
    selectRows.push({ fullName: "Rodrigo Medina" });
    getUserById.mockResolvedValue({
      data: { user: { email: "rodrigo@test.com" } },
      error: null,
    });

    await callReal({ providerId: PROVIDER_ID, status: "approved" });

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: PROVIDER_ID,
        type: "verification_result",
        link: "/pro/inicio",
      }),
    );
    expect(sendPushToUsers).toHaveBeenCalledWith(
      [PROVIDER_ID],
      expect.objectContaining({ title: expect.stringMatching(/aprobada/i) }),
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "rodrigo@test.com" }),
    );
  });

  it("rechazado: el motivo viaja en la notificación y linkea a /pro/verificacion", async () => {
    selectRows.push({ fullName: "Rodrigo Medina" });
    getUserById.mockResolvedValue({
      data: { user: { email: "rodrigo@test.com" } },
      error: null,
    });

    await callReal({
      providerId: PROVIDER_ID,
      status: "rejected",
      reason: "La selfie no coincide con el DNI",
    });

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: PROVIDER_ID,
        link: "/pro/verificacion",
        body: expect.stringContaining("La selfie no coincide con el DNI"),
      }),
    );
  });

  it("si no se puede resolver el email, in-app y push salen igual", async () => {
    selectRows.push({ fullName: "Rodrigo Medina" });
    getUserById.mockResolvedValue({ data: { user: null }, error: null });

    await callReal({ providerId: PROVIDER_ID, status: "approved" });

    expect(insertValues).toHaveBeenCalled();
    expect(sendPushToUsers).toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("actions de admin · aprobar / rechazar con motivo", () => {
  beforeEach(() => {
    (getSession as Mock).mockResolvedValue({
      user: { id: "admin-1" },
      role: "admin",
    });
  });

  it("rejectProvider exige un motivo válido", async () => {
    const { rejectProvider } = await import("@/lib/actions/admin");
    const res = await rejectProvider(PROVIDER_ID, "mal");
    expect(res.ok).toBe(false);
    expect(updateSet).not.toHaveBeenCalled();
  });

  it("rejectProvider guarda estado + motivo y notifica", async () => {
    const { rejectProvider } = await import("@/lib/actions/admin");
    const res = await rejectProvider(
      PROVIDER_ID,
      "La foto del DNI está borrosa",
    );
    expect(res).toEqual({ ok: true });
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        verificationStatus: "rejected",
        rejectionReason: "La foto del DNI está borrosa",
      }),
    );
    expect(notifyVerificationResult).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: PROVIDER_ID,
        status: "rejected",
        reason: "La foto del DNI está borrosa",
      }),
    );
  });

  it("approveProvider limpia el motivo anterior y notifica", async () => {
    const { approveProvider } = await import("@/lib/actions/admin");
    const res = await approveProvider(PROVIDER_ID);
    expect(res).toEqual({ ok: true });
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        verificationStatus: "approved",
        rejectionReason: null,
      }),
    );
    expect(notifyVerificationResult).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: PROVIDER_ID, status: "approved" }),
    );
  });

  it("sin sesión de admin no toca nada", async () => {
    (getSession as Mock).mockResolvedValue({
      user: { id: "u1" },
      role: "provider",
    });
    const { approveProvider } = await import("@/lib/actions/admin");
    const res = await approveProvider(PROVIDER_ID);
    expect(res.ok).toBe(false);
    expect(updateSet).not.toHaveBeenCalled();
    expect(notifyVerificationResult).not.toHaveBeenCalled();
  });
});
