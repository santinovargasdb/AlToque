import { NextResponse, type NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Vercel Cron — expira los pedidos urgentes en broadcast que nadie aceptó.
 * Protegido por CRON_SECRET (Vercel manda `Authorization: Bearer <CRON_SECRET>`).
 * Schedule en vercel.json (cada 5 minutos).
 */
const TTL_MINUTES = 10;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expired = (await db.execute(
    sql`update jobs set status = 'expired', updated_at = now()
        where status = 'broadcasting'
          and created_at < now() - interval '${sql.raw(String(TTL_MINUTES))} minutes'
        returning id`,
  )) as unknown as { id: string }[];

  if (expired.length > 0) {
    await db.execute(
      sql`update job_dispatch set status = 'expired', responded_at = now()
          where status = 'notified'
            and job_id in (select id from jobs where status = 'expired')`,
    );
  }

  return NextResponse.json({ expired: expired.length });
}
