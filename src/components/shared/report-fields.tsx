"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  REPORT_REASON_LABELS,
  REPORT_REASONS,
  type ReportReason,
} from "@/lib/validations/report";

/** Motivo y descripción de un reporte. */
export function ReportFields({
  reason,
  description,
  onReasonChange,
  onDescriptionChange,
}: {
  reason: ReportReason | "";
  description: string;
  onReasonChange: (reason: ReportReason) => void;
  onDescriptionChange: (description: string) => void;
}) {
  // Propio de cada instancia: en el pedido pueden convivir dos formularios.
  const id = useId();
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-reason`}>Motivo</Label>
        <select
          id={`${id}-reason`}
          required
          value={reason}
          onChange={(e) => onReasonChange(e.target.value as ReportReason)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="" disabled>
            Elegí un motivo
          </option>
          {REPORT_REASONS.map((r) => (
            <option key={r} value={r}>
              {REPORT_REASON_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-description`}>Qué pasó</Label>
        <Textarea
          id={`${id}-description`}
          required
          rows={4}
          maxLength={1000}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Solo lo ve el equipo de AlToque.
        </p>
      </div>
    </>
  );
}
