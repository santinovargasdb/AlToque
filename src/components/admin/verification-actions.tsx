"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveProvider, rejectProvider } from "@/lib/actions/admin";

export function VerificationActions({ providerId }: { providerId: string }) {
  const [pending, startTransition] = useTransition();

  function run(action: "approve" | "reject") {
    startTransition(async () => {
      const res =
        action === "approve"
          ? await approveProvider(providerId)
          : await rejectProvider(providerId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        action === "approve" ? "Profesional aprobado." : "Verificación rechazada.",
      );
    });
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="success"
        disabled={pending}
        onClick={() => run("approve")}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        Aprobar
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() => run("reject")}
      >
        <X className="size-4" />
        Rechazar
      </Button>
    </div>
  );
}
