import { describe, it, expect } from "vitest";
import {
  emailSchema,
  passwordSchema,
  signUpSchema,
  PASSWORD_RULES,
} from "@/lib/validations/auth";

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
