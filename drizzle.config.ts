import { defineConfig } from "drizzle-kit";

// Las migraciones se generan desde src/lib/db/schema.ts.
// Tras `db:migrate`, correr drizzle/postgis.sql en Supabase
// (extensión PostGIS, índices GIST, find_nearby_providers, RLS).
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
