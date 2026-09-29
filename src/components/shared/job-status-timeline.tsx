"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { ease, spring } from "@/lib/motion";
import type { JobStatus } from "@/types";

const STEPS: { key: JobStatus; label: string }[] = [
  { key: "requested", label: "Solicitado" },
  { key: "accepted", label: "Aceptado" },
  { key: "in_progress", label: "En curso" },
  { key: "completed", label: "Completado" },
];

const ORDER: Record<string, number> = {
  requested: 0,
  broadcasting: 0,
  accepted: 1,
  in_progress: 2,
  completed: 3,
};

export function JobStatusTimeline({ status }: { status: JobStatus }) {
  const reduce = useReducedMotion();

  if (status === "cancelled" || status === "expired") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-xs font-medium text-destructive">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-4 shrink-0">
          <circle cx="8" cy="8" r="6" />
          <path d="m5.5 5.5 5 5M10.5 5.5l-5 5" />
        </svg>
        <span>
          {status === "cancelled" ? "Pedido cancelado" : "Pedido vencido"}
        </span>
      </div>
    );
  }

  const current = ORDER[status] ?? 0;

  return (
    <ol className="flex items-center">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step.key} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span
                className={cn(
                  "h-0.5 flex-1 transition-colors duration-500",
                  i === 0 ? "opacity-0" : done || active ? "bg-primary" : "bg-border",
                )}
              />
              <span
                className={cn(
                  "relative flex size-7 shrink-0 items-center justify-center rounded-[4px] border font-mono text-xs transition-colors duration-300 select-none",
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : active
                      ? "border-primary bg-primary-subtle font-bold text-primary"
                      : "border-border bg-card text-muted-foreground",
                )}
              >
                {/* Pulso sutil del paso actual */}
                {active && !reduce && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-[4px] ring-2 ring-primary/40"
                    animate={{ opacity: [0.55, 0], scale: [1, 1.35] }}
                    transition={{ duration: 1.9, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
                {done ? (
                  <motion.svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="size-3.5"
                    initial={reduce ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={spring.snappy}
                  >
                    <motion.path
                      d="M3 8.5 6.5 12 13 4.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={reduce ? false : { pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.35, ease: ease.enter, delay: 0.06 }}
                    />
                  </motion.svg>
                ) : active ? (
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-3.5">
                    <circle cx="8" cy="8" r="6" />
                    <path d="M8 4.5V8l2.5 1.5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cn(
                  "h-0.5 flex-1 transition-colors duration-500",
                  i === STEPS.length - 1
                    ? "opacity-0"
                    : done
                      ? "bg-primary"
                      : "bg-border",
                )}
              />
            </div>
            <span
              className={cn(
                "mt-1.5 text-center text-[11px] transition-colors duration-300",
                active || done ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
