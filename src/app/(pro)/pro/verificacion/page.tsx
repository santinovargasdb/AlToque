import Link from "next/link";
import { eq } from "drizzle-orm";
import { ShieldCheck, Clock, ShieldX } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { providerProfiles } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { VerificationForm } from "@/components/pro/verification-form";

export default async function VerificacionPage() {
  const { user } = await requireRole("provider");

  const [pp] = await db
    .select({
      status: providerProfiles.verificationStatus,
      dni: providerProfiles.idDocumentUrl,
      selfie: providerProfiles.selfieUrl,
    })
    .from(providerProfiles)
    .where(eq(providerProfiles.profileId, user.id))
    .limit(1);

  const status = pp?.status ?? "pending";
  const hasDocs = !!pp?.dni && !!pp?.selfie;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Verificación</h1>
          <p className="text-muted-foreground">
            La confianza es el corazón de AlToque: verificamos tu identidad
            antes de mostrarte en las búsquedas.
          </p>
        </div>
        <StatusBadge status={status} />
      </header>

      {status === "approved" ? (
        <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 p-5">
          <ShieldCheck className="size-6 text-success" />
          <div>
            <p className="font-medium">¡Estás verificado!</p>
            <p className="text-sm text-muted-foreground">
              Ya aparecés en las búsquedas. <Link href="/pro/inicio" className="text-primary">Ir al panel</Link>.
            </p>
          </div>
        </div>
      ) : (
        <>
          {status === "pending" && hasDocs && (
            <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/5 p-5">
              <Clock className="size-6 text-warning" />
              <div>
                <p className="font-medium">Documentos en revisión</p>
                <p className="text-sm text-muted-foreground">
                  Un admin los va a revisar pronto. Podés reemplazarlos abajo si
                  hace falta.
                </p>
              </div>
            </div>
          )}
          {status === "rejected" && (
            <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
              <ShieldX className="size-6 text-destructive" />
              <div>
                <p className="font-medium">Verificación rechazada</p>
                <p className="text-sm text-muted-foreground">
                  Revisá que las fotos sean legibles y volvé a enviarlas.
                </p>
              </div>
            </div>
          )}
          <div className="rounded-xl border border-border bg-card p-5 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
            <VerificationForm />
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  if (status === "approved")
    return <Badge variant="success"><ShieldCheck className="size-3.5" /> Verificado</Badge>;
  if (status === "rejected")
    return <Badge variant="destructive"><ShieldX className="size-3.5" /> Rechazado</Badge>;
  return <Badge variant="warning"><Clock className="size-3.5" /> Pendiente</Badge>;
}
