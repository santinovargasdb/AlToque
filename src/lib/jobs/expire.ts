import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { URGENT_JOB_TTL_MINUTES } from "@/lib/jobs/urgent";

/**
 * Cierra las urgencias que nadie aceptó dentro del plazo, junto con su despacho.
 * El plan Hobby de Vercel solo permite un cron diario, así que además se llama al
 * leer los pedidos del cliente (con `clientId`), para que no vea "Buscando" hasta
 * la noche. Un solo statement: es atómico e idempotente. Devuelve cuántas cerró.
 */
export async function expireStaleUrgentJobs(clientId?: string): Promise<number> {
  const rows = (await db.execute(
    sql`with expired as (
          update jobs set status = 'expired', updated_at = now()
          where status = 'broadcasting'
            and created_at < now() - make_interval(mins => ${URGENT_JOB_TTL_MINUTES}::int)
            ${clientId ? sql`and client_id = ${clientId}` : sql``}
          returning id
        ), dispatched as (
          update job_dispatch set status = 'expired', responded_at = now()
          where status = 'notified' and job_id in (select id from expired)
        )
        select count(*)::int as n from expired`,
  )) as unknown as { n: number }[];
  return rows[0]?.n ?? 0;
}
