import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

// Cliente Postgres (pooler de Supabase). Reusado entre invocaciones
// serverless gracias a Fluid Compute / instancia compartida.
const client = postgres(env.DATABASE_URL, { prepare: false });

export const db = drizzle(client, { schema });

export { schema };

/**
 * Fragmento SQL para escribir un punto geográfico (PostGIS espera lng, lat).
 * Uso: `db.update(jobs).set({ location: pointSql(lng, lat) })` con sql crudo,
 * o dentro de un insert con `.values({ location: pointSql(...) as never })`.
 */
export function pointSql(lng: number, lat: number) {
  return sql`st_setsrid(st_makepoint(${lng}, ${lat}), 4326)`;
}
