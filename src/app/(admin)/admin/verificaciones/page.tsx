import { and, eq, isNotNull } from "drizzle-orm";
import { FileText, ImageIcon, Inbox } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles, providerProfiles } from "@/lib/db/schema";
import { signedVerificationUrl } from "@/lib/storage";
import { VerificationActions } from "@/components/admin/verification-actions";

export default async function AdminVerificacionesPage() {
  await requireRole("admin");

  const pending = await db
    .select({
      id: providerProfiles.profileId,
      name: profiles.fullName,
      phone: profiles.phone,
      bio: providerProfiles.bio,
      dni: providerProfiles.idDocumentUrl,
      selfie: providerProfiles.selfieUrl,
    })
    .from(providerProfiles)
    .innerJoin(profiles, eq(profiles.id, providerProfiles.profileId))
    .where(
      and(
        eq(providerProfiles.verificationStatus, "pending"),
        isNotNull(providerProfiles.idDocumentUrl),
      ),
    );

  const items = await Promise.all(
    pending.map(async (p) => ({
      ...p,
      dniUrl: p.dni ? await signedVerificationUrl(p.dni) : null,
      selfieUrl: p.selfie ? await signedVerificationUrl(p.selfie) : null,
    })),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-bold">
          Cola de verificación
        </h1>
        <p className="text-muted-foreground">
          Revisá los documentos y aprobá o rechazá a cada profesional.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <Inbox className="size-8" />
          <p>No hay verificaciones pendientes.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-border bg-card p-5 shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium">{p.name ?? "Sin nombre"}</p>
                  {p.phone && (
                    <p className="text-sm text-muted-foreground">{p.phone}</p>
                  )}
                  {p.bio && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {p.bio}
                    </p>
                  )}
                  <div className="mt-3 flex gap-4 text-sm">
                    <DocLink href={p.dniUrl} icon="doc" label="Ver DNI" />
                    <DocLink href={p.selfieUrl} icon="img" label="Ver selfie" />
                  </div>
                </div>
                <VerificationActions providerId={p.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DocLink({
  href,
  icon,
  label,
}: {
  href: string | null;
  icon: "doc" | "img";
  label: string;
}) {
  const Icon = icon === "doc" ? FileText : ImageIcon;
  if (!href)
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-4" /> sin archivo
      </span>
    );
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-primary hover:underline"
    >
      <Icon className="size-4" /> {label}
    </a>
  );
}
