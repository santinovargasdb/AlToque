import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit solo autocarga `.env` (nunca `.env.local`), así que lo hacemos
// explícito. En Vercel/CI las variables ya vienen del entorno y esto es no-op.
loadEnv({ path: ".env.migrate", override: false }); // opcional: URL de prod
loadEnv({ path: ".env.local", override: false });
loadEnv({ override: false }); // .env

// Las migraciones se generan desde src/lib/db/schema.ts.
// Tras `db:migrate`, correr drizzle/postgis.sql en Supabase
// (extensión PostGIS, índices GIST, find_nearby_providers, RLS).
//
// ⚠️ Contra Supabase migrar por el POOLER DE SESIÓN (puerto 5432) o la
// conexión directa — NUNCA por el de transacción (6543): drizzle-kit corre
// el DDL dentro de transacciones y pgBouncer en modo transacción lo rompe.
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // MIGRATION_DATABASE_URL permite apuntar las migraciones a una URL
    // distinta de la que usa la app en runtime (pooler de transacción).
    url: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
