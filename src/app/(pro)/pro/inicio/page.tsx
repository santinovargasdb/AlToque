import Link from "next/link";
import { sql } from "drizzle-orm";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { ProDispatchPanel } from "@/components/pro/pro-dispatch-panel";
import { PushSubscribe } from "@/components/shared/push-subscribe";
import { cn } from "@/lib/utils";

export default async function ProInicioPage() {
  const { user, profile } = await requireRole("provider");

  const rows = (await db.execute(sql`
    select (base_location is not null) as has_loc,
           verification_status as status,
           (id_document_url is not null and selfie_url is not null) as has_docs,
           mp_connected,
           is_online,
           (select count(*) from provider_categories pc where pc.provider_id = ${user.id}) as cat_count
    from provider_profiles where profile_id = ${user.id}
  `)) as unknown as Array<{
    has_loc: boolean;
    status: "pending" | "approved" | "rejected";
    has_docs: boolean;
    mp_connected: boolean;
    is_online: boolean;
    cat_count: number;
  }>;
  const s = rows[0];

  const profileDone = !!s && s.has_loc && Number(s.cat_count) > 0;
  const verified = s?.status === "approved";
  const docsSent = !!s?.has_docs;
  const mpDone = !!s?.mp_connected;
  const allDone = profileDone && verified && mpDone;

  const steps = [
    {
      done: profileDone,
      title: "Completá tu perfil",
      desc: "Oficios y zona de trabajo",
      href: "/pro/perfil",
    },
    {
      done: verified,
      title: "Verificá tu identidad",
      desc: verified
        ? "Aprobado"
        : docsSent
          ? "Documentos en revisión"
          : "Subí tu DNI y selfie",
      href: "/pro/verificacion",
    },
    {
      done: mpDone,
      title: "Conectá Mercado Pago",
      desc: "Para cobrar por la app (Step 9)",
      href: "/pro/cobros",
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">
            {profile?.fullName ?? "Profesional"}
          </h1>
          <p className="text-muted-foreground">Tu panel de trabajos</p>
        </div>
        <div className="flex items-center gap-2">
          {verified && <VerifiedBadge />}
          <SignOutButton />
        </div>
      </header>

      {!allDone && (
        <section className="rounded-xl border border-border bg-card p-5 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          <h2 className="font-heading text-lg font-semibold">
            Activá tu cuenta
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Completá estos pasos para empezar a recibir pedidos.
          </p>
          <ul className="divide-y divide-border">
            {steps.map((step) => (
              <li key={step.href}>
                <Link
                  href={step.href}
                  className="flex items-center gap-3 py-3"
                >
                  {step.done ? (
                    <CheckCircle2 className="size-5 shrink-0 text-success" />
                  ) : (
                    <Circle className="size-5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="flex-1">
                    <span
                      className={cn(
                        "block font-medium",
                        step.done && "text-muted-foreground line-through",
                      )}
                    >
                      {step.title}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {step.desc}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {verified ? (
        <>
          <PushSubscribe />
          <ProDispatchPanel
            providerId={user.id}
            initialOnline={!!s?.is_online}
          />
        </>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          Verificá tu identidad para ponerte en línea y recibir pedidos
          urgentes.
        </div>
      )}
    </div>
  );
}
