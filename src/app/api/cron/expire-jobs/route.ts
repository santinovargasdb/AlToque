import { NextResponse, type NextRequest } from "next/server";
import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { refundJobPayment } from "@/lib/mercadopago/refund";

/**
 * Vercel Cron — expira pedidos urgentes vencidos:
 *  - en broadcast que nadie aceptó, y
 *  - aceptados que el cliente nunca pagó (paymentStatus none/pending).
 * Si un job expirado tenía el pago retenido (held), lo reintegra.
 * Protegido por CRON_SECRET. Schedule en vercel.json (cada 5 min).
 */
const TTL_MINUTES = 10;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expired = (await db.execute(
    sql`update jobs set status = 'expired', updated_at = now()
        where created_at < now() - interval '${sql.raw(String(TTL_MINUTES))} minutes'
          and (
            status = 'broadcasting'
            or (type = 'urgent' and status = 'accepted'
                and payment_status in ('none','pending'))
          )
        returning id, payment_status, mp_payment_id`,
  )) as unknown as {
    id: string;
    payment_status: string;
    mp_payment_id: string | null;
  }[];

  if (expired.length > 0) {
    await db.execute(
      sql`update job_dispatch set status = 'expired', responded_at = now()
          where status = 'notified'
            and job_id in (select id from jobs where status = 'expired')`,
    );

    // Reintegrar los que estaban pagados (held) pero nadie completó.
    for (const j of expired) {
      if (j.payment_status === "held" && j.mp_payment_id) {
        await refundJobPayment(j.mp_payment_id);
        await db
          .update(jobs)
          .set({ paymentStatus: "refunded", updatedAt: new Date() })
          .where(eq(jobs.id, j.id));
      }
    }
  }

  return NextResponse.json({ expired: expired.length });
}
