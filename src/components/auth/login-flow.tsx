"use client";

import { useState } from "react";
import { OtpForm } from "./otp-form";
import { PasswordLoginForm } from "./password-login-form";
import { GoogleButton } from "./google-button";
import { AuthDivider } from "./auth-divider";

type Method = "password" | "otp";

/**
 * Flujo de login de `/ingresar`: Google (OAuth) arriba y, debajo del
 * separador, contraseña (default) o código por email, alternables.
 *
 * @param redirectTo Ruta interna a la que volver tras autenticar
 *   (ya viene validada contra open redirect por la página).
 */
export function LoginFlow({ redirectTo }: { redirectTo: string }) {
  const [method, setMethod] = useState<Method>("password");

  return (
    <div className="space-y-4">
      <GoogleButton redirectTo={redirectTo} />

      <AuthDivider />

      {method === "password" ? (
        <PasswordLoginForm redirectTo={redirectTo} />
      ) : (
        <OtpForm mode="login" redirectTo={redirectTo} />
      )}

      <button
        type="button"
        onClick={() => setMethod(method === "password" ? "otp" : "password")}
        className="w-full text-center text-sm font-medium text-primary"
      >
        {method === "password"
          ? "Prefiero ingresar con un código por email"
          : "Prefiero ingresar con mi contraseña"}
      </button>
    </div>
  );
}
