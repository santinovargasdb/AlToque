"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

let inAppNavigations = 0;

export function recordInAppNavigation() {
  inAppNavigations += 1;
}

export function BackButton({
  fallbackHref,
  label = "Volver",
  className,
}: {
  fallbackHref: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        if (inAppNavigations > 0) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
        aria-hidden="true"
      >
        <path d="M12.5 4.5 7 10l5.5 5.5" />
      </svg>
    </button>
  );
}
