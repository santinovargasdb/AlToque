import type { ReactNode } from "react";

/* Iconografía vectorial propia para los 8 oficios (trazo consistente 1.6px) */
const TRADE_PATHS: Record<string, ReactNode> = {
  plomeria: (
    <>
      <path d="M4 14V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M12 10h4a2 2 0 0 1 2 2v4" />
      <rect x="2" y="14" width="4" height="3" rx="0.5" />
      <rect x="16" y="14" width="4" height="3" rx="0.5" />
    </>
  ),
  cerrajeria: (
    <>
      <circle cx="7" cy="10" r="4" />
      <path d="M11 10h6M15 10v2M17 10v2" />
    </>
  ),
  electricista: (
    <polygon points="11 2 3 11 10 11 9 18 17 9 10 9 11 2" />
  ),
  gasista: (
    <>
      <path d="M10 2c-3 4-6 6.5-6 10a6 6 0 0 0 12 0c0-3.5-3-6-6-10Z" />
      <path d="M10 15a2.5 2.5 0 0 0 2.5-2.5c0-1.5-1.5-2.5-2.5-4" />
    </>
  ),
  techista: (
    <>
      <path d="M2 11 10 3l8 8" />
      <path d="M4 10v7h12v-7" />
    </>
  ),
  carpinteria: (
    <>
      <path d="M14 3 6 11l3 3 8-8-3-3Z" />
      <path d="M6 11 3 14l3 3 3-3" />
    </>
  ),
  pintor: (
    <>
      <rect x="3" y="3" width="14" height="6" rx="1" />
      <path d="M10 9v5a2 2 0 0 1-2 2H7" />
      <path d="M7 16v2" />
    </>
  ),
  albanil: (
    <>
      <rect x="2" y="3" width="16" height="4" rx="0.5" />
      <rect x="2" y="8" width="7" height="4" rx="0.5" />
      <rect x="11" y="8" width="7" height="4" rx="0.5" />
      <rect x="2" y="13" width="16" height="4" rx="0.5" />
    </>
  ),
};

export function TradeIcon({
  slug,
  className = "size-5",
}: {
  slug: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {TRADE_PATHS[slug] ?? TRADE_PATHS.plomeria}
    </svg>
  );
}
