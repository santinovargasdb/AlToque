"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { settleCommission } from "@/lib/actions/admin";

/** Marca una comisión adeudada (efectivo) como saldada. */
export function SettleCommissionButton({ ledgerId }: { ledgerId: string }) {
  const [pending, startTransition] = useTransition();

  function settle() {
    startTransition(async () => {
      const res = await settleCommission(ledgerId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Comisión marcada como saldada.");
    });
  }

  return (
    <Button size="sm" variant="success" disabled={pending} onClick={settle}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Check className="size-4" />
      )}
      Saldar
    </Button>
  );
}
