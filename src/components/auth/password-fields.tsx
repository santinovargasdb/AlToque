"use client";

import { motion, useReducedMotion } from "motion/react";
import { Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { PASSWORD_RULES } from "@/lib/validations/auth";

/**
 * Par de campos fijos "Contraseña" + "Repetir contraseña" con checklist de
 * requisitos en tiempo real. Las reglas vienen de PASSWORD_RULES (la misma
 * fuente que valida el servidor), así el feedback nunca diverge del backend.
 */
export function PasswordFields({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmChange,
  autoFocus = false,
}: {
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const reduce = useReducedMotion();

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          maxLength={72}
          required
          autoFocus={autoFocus}
        />
        <ul className="mt-1.5 space-y-1" aria-live="polite">
          {PASSWORD_RULES.map((rule) => {
            const passed = rule.test(password);
            return (
              <li
                key={rule.id}
                className={cn(
                  "flex items-center gap-1.5 text-xs",
                  passed ? "text-success" : "text-muted-foreground",
                )}
              >
                {passed ? (
                  <motion.span
                    className="inline-flex"
                    initial={reduce ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={spring.snappy}
                  >
                    <Check className="size-3.5" />
                  </motion.span>
                ) : (
                  <X className="size-3.5" />
                )}
                {rule.label}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Repetir contraseña</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => onConfirmChange(e.target.value)}
          maxLength={72}
          required
          aria-invalid={mismatch}
        />
        {mismatch && (
          <p className="text-xs text-destructive">
            Las contraseñas no coinciden.
          </p>
        )}
      </div>
    </>
  );
}
