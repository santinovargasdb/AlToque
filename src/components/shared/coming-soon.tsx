import { Hammer } from "lucide-react";

/** Placeholder consistente para vistas que se construyen en pasos posteriores. */
export function ComingSoon({
  title,
  step,
}: {
  title: string;
  step: string;
}) {
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold">{title}</h1>
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
        <Hammer className="size-8" />
        <p>En construcción</p>
        <p className="text-sm">{step}</p>
      </div>
    </div>
  );
}
