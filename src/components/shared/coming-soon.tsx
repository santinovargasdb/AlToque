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
      <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-16 text-center text-muted-foreground">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
        <p>En construcción</p>
        <p className="text-sm">{step}</p>
      </div>
    </div>
  );
}
