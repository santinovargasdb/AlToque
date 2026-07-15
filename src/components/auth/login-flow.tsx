"use client";

import { useState } from "react";
import { OtpForm } from "./otp-form";
import { PasswordLoginForm } from "./password-login-form";

type Method = "password" | "otp";

/** Login con contraseña (default) o con código por email, alternables. */
export function LoginFlow({ redirectTo }: { redirectTo: string }) {
  const [method, setMethod] = useState<Method>("password");

  return (
    <div className="space-y-4">
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
