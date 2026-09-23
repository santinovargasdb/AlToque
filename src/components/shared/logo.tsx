import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "default" | "pro" | "icon";
  size?: "sm" | "default" | "lg";
  href?: string;
  className?: string;
}

export function Logo({
  variant = "default",
  size = "default",
  href,
  className,
}: LogoProps) {
  const iconSizes = {
    sm: "size-6",
    default: "size-7",
    lg: "size-9",
  };

  const textSizes = {
    sm: "text-base",
    default: "text-lg",
    lg: "text-xl",
  };

  const badgeSizes = {
    sm: "text-[9px] px-1 py-0",
    default: "text-[10px] px-1.5 py-0.2",
    lg: "text-xs px-2 py-0.5",
  };

  const content = (
    <span className={cn("inline-flex items-center gap-2 select-none", className)}>
      {/* Isotipo: Sello geométrico con trazo técnico */}
      <span
        className={cn(
          "relative flex items-center justify-center rounded-[5px] border border-primary/40 bg-primary-subtle text-primary transition-colors",
          iconSizes[size],
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4 shrink-0"
          aria-hidden="true"
        >
          {/* Geometría técnica: chispa de urgencia y precisión */}
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" fillOpacity="0.15" />
        </svg>
      </span>

      {variant !== "icon" && (
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "font-heading font-bold tracking-tight text-foreground",
              textSizes[size],
            )}
          >
            Al<span className="text-primary">Toque</span>
          </span>
          {variant === "pro" && (
            <span
              className={cn(
                "rounded-[3px] border border-primary/30 bg-primary-subtle font-mono font-bold uppercase tracking-wider text-primary",
                badgeSizes[size],
              )}
            >
              Pro
            </span>
          )}
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-[5px]">
        {content}
      </Link>
    );
  }

  return content;
}
