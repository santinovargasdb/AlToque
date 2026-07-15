import Link from "next/link";
import { Zap } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Zap className="size-5" />
        </span>
        <span className="font-heading text-xl font-bold">AlToque</span>
      </Link>
      {/* Entrada suave (tw-animate-css): fade + slide sutil al montar. */}
      <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-border bg-card p-6 shadow-[0_2px_8px_rgba(15,23,42,0.06)] duration-300">
        {children}
      </div>
    </div>
  );
}
