/**
 * ════════════════════════════════════════════════════════════════
 * Limpieza de los profesionales de PRUEBA creados por
 * scripts/seed-test-providers.ts.
 *
 * ⚠️  BORRA EN LA BASE DE PRODUCCIÓN. Identifica a los usuarios
 *     EXCLUSIVAMENTE por el patrón de email del seed
 *     (`seed+…@altoque.test`) — no toca a nadie más — y borra su
 *     auth.users + profiles (provider_profiles, provider_categories,
 *     notifications y push_subscriptions caen en cascada).
 *
 * Uso: pnpm seed:test-providers:remove   (pide confirmación)
 *      … -- --yes                        (sin confirmación)
 *
 * Si un usuario de prueba tiene jobs/reviews/comisiones asociados
 * (FKs sin cascada), se saltea y se informa: borrá esos registros
 * primero o dejalo para no romper la integridad.
 * ════════════════════════════════════════════════════════════════
 */
import { createInterface } from "node:readline/promises";
import { config } from "dotenv";
import { createClient, type User } from "@supabase/supabase-js";

config({ path: ".env.local" });
config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY (.env.local).",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Mismo patrón que usa el seed. Anclado y con dominio reservado .test:
// imposible que matchee un usuario real.
const SEED_EMAIL_RE = /^seed\+[a-z0-9._-]+@altoque\.test$/i;

async function listSeedUsers(): Promise<User[]> {
  const perPage = 200;
  const hits: User[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error(`✖ listUsers (página ${page}): ${error.message}`);
      process.exit(1);
    }
    hits.push(...data.users.filter((u) => u.email && SEED_EMAIL_RE.test(u.email)));
    if (data.users.length < perPage) break;
  }
  return hits;
}

async function main() {
  console.log(`Base: ${url}\n`);

  const users = await listSeedUsers();
  if (users.length === 0) {
    console.log("No hay usuarios de seed (seed+…@altoque.test). Nada que borrar.");
    return;
  }

  console.log(`Se van a borrar ${users.length} usuarios de PRODUCCIÓN:`);
  for (const u of users) console.log(`   ${u.email}  (${u.id})`);

  if (!process.argv.includes("--yes")) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question("\nEscribí 'borrar' para confirmar: ");
    rl.close();
    if (answer.trim().toLowerCase() !== "borrar") {
      console.log("Cancelado. No se borró nada.");
      return;
    }
  }

  let removed = 0;
  let skipped = 0;
  for (const u of users) {
    // Primero profiles: si tiene jobs/reviews/comisiones (FKs sin cascada)
    // falla acá y NO tocamos auth.users, así el usuario queda consistente.
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", u.id);
    if (profileError) {
      console.log(`   ⚠ ${u.email}: no se borró (${profileError.message}).`);
      console.log("     Probablemente tenga jobs/reviews asociados; borralos primero.");
      skipped += 1;
      continue;
    }
    const { error: authError } = await supabase.auth.admin.deleteUser(u.id);
    if (authError) {
      console.log(`   ⚠ ${u.email}: profiles borrado pero auth falló: ${authError.message}`);
      skipped += 1;
      continue;
    }
    console.log(`   ✔ ${u.email} eliminado`);
    removed += 1;
  }

  console.log(`\nListo: ${removed} eliminados, ${skipped} salteados.`);
  if (skipped > 0) process.exitCode = 1;
}

await main();
