import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles, providerProfiles } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/shared/rating-stars";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Profesionales" };

const VERIFICATION_LABEL = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
} as const;
const VERIFICATION_VARIANT = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
} as const;

/** Listado global de profesionales para el admin (Step 12). */
export default async function AdminProfesionalesPage() {
  await requireRole("admin");

  const rows = await db
    .select({
      id: providerProfiles.profileId,
      fullName: profiles.fullName,
      phone: profiles.phone,
      createdAt: profiles.createdAt,
      verificationStatus: providerProfiles.verificationStatus,
      isOnline: providerProfiles.isOnline,
      ratingAvg: providerProfiles.ratingAvg,
      jobsCompleted: providerProfiles.jobsCompleted,
    })
    .from(providerProfiles)
    .innerJoin(profiles, eq(profiles.id, providerProfiles.profileId))
    .orderBy(desc(profiles.createdAt))
    .limit(200);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Profesionales</h1>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Todavía no hay profesionales registrados.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Alta</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Verificación</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3 text-right">Trabajos</th>
                <th className="px-4 py-3">Online</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDate(p.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-medium">{p.fullName ?? "—"}</td>
                  <td className="px-4 py-3">{p.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={VERIFICATION_VARIANT[p.verificationStatus]}>
                      {VERIFICATION_LABEL[p.verificationStatus]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <RatingStars rating={Number(p.ratingAvg)} showCount={false} />
                  </td>
                  <td className="px-4 py-3 text-right">{p.jobsCompleted}</td>
                  <td className="px-4 py-3">
                    {p.isOnline ? (
                      <Badge variant="success">Online</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
