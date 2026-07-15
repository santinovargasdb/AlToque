import { NextResponse, type NextRequest } from "next/server";
import {
  purgeOrphanProfiles,
  ORPHAN_GRACE_HOURS,
} from "@/lib/db/maintenance";

/**
 * Vercel Cron — mantenimiento de cuentas huérfanas (registros OAuth que
 * nunca completaron el onboarding de /completar-perfil en 48 h).
 *
 * Seguro por defecto: corre en modo `dryRun` (solo lista candidatos en la
 * respuesta/logs). El borrado real requiere opt-in explícito:
 *  - env `ORPHAN_PURGE_ENABLED="true"` (para el cron agendado), o
 *  - query `?purge=1` (para una corrida manual puntual con el secret).
 *
 * Protegido por CRON_SECRET. Schedule en vercel.json (diario).
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const purgeRequested =
    process.env.ORPHAN_PURGE_ENABLED === "true" ||
    request.nextUrl.searchParams.get("purge") === "1";

  const result = await purgeOrphanProfiles({
    olderThanHours: ORPHAN_GRACE_HOURS,
    dryRun: !purgeRequested,
  });

  console.log(
    `[maintenance] cleanup-orphans: ${result.scanned} candidatos, ` +
      `${result.purged.length} ${result.dryRun ? "purgables (dry-run)" : "purgados"}, ` +
      `${result.skipped.length} salteados`,
  );

  return NextResponse.json(result);
}
