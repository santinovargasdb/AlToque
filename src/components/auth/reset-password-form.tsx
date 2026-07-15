"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordFields } from "./password-fields";
import { updatePassword } from "@/lib/actions/auth";
import { logAuthError } from "@/lib/auth-log";
import {
  updatePasswordSchema,
  PASSWORD_RULES,
} from "@/lib/validations/auth";

/** Form de nueva contraseña (llega acá desde el link de recovery). */
export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, startTransition] = useTransition();

  const passwordOk = PASSWORD_RULES.every((r) => r.test(password));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = updatePasswordSchema.safeParse({
      password,
      confirmPassword,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisá la contraseña.");
      return;
    }
    startTransition(async () => {
      const res = await updatePassword(parsed.data);
      if (!res.ok) {
        logAuthError("recovery:update-password", res.error);
        toast.error(res.error);
        return;
      }
      toast.success("Contraseña actualizada.");
      window.location.href = "/inicio";
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PasswordFields
        password={password}
        confirmPassword={confirmPassword}
        onPasswordChange={setPassword}
        onConfirmChange={setConfirmPassword}
        autoFocus
      />
      <Button
        type="submit"
        className="w-full"
        disabled={pending || !passwordOk || password !== confirmPassword}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Guardar nueva contraseña
      </Button>
    </form>
  );
}
