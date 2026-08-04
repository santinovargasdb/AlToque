/**
 * ════════════════════════════════════════════════════════════════
 * Seed de profesionales de PRUEBA para AlToque.
 *
 * ⚠️  ESCRIBE EN LA BASE DE PRODUCCIÓN (la que apunte
 *     NEXT_PUBLIC_SUPABASE_URL en .env.local). Crea 3 usuarios de
 *     auth REALES con emails `seed+*@altoque.test` y los deja como
 *     profesionales `approved`, visibles en la búsqueda pública.
 *
 * Uso:      pnpm seed:test-providers
 * Deshacer: pnpm seed:test-providers:remove
 *
 * - Idempotente: si los usuarios ya existen no duplica; re-aplica el
 *   estado esperado con upserts.
 * - Credenciales: solo lee .env.local (NEXT_PUBLIC_SUPABASE_URL +
 *   SUPABASE_SERVICE_ROLE_KEY). Acá no va ninguna clave.
 * - La contraseña de cada usuario se genera al azar y se imprime UNA
 *   vez (al crearlo); en re-corridas no se cambia ni se vuelve a ver.
 * ════════════════════════════════════════════════════════════════
 */
import { randomBytes } from "node:crypto";
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

// Punto de referencia: Lomas del Palomar / Caseros.
const SEED_POINT = { lat: -34.6069, lng: -58.5854 };

type SeedProvider = {
  email: string;
  fullName: string;
  phone: string;
  bio: string;
  categorySlug: "plomeria" | "electricista" | "cerrajeria";
  location: { lat: number; lng: number };
  /** Distancia aproximada a SEED_POINT, solo informativa. */
  approxKm: number;
  serviceRadiusKm: number;
  isOnline: boolean;
  ratingAvg: number;
  jobsCompleted: number;
};

// Offsets calculados a mano: 1° lat ≈ 111.2 km; 1° lng ≈ 91.6 km a -34.6°.
const SEED_PROVIDERS: SeedProvider[] = [
  {
    email: "seed+plomero1@altoque.test",
    fullName: "Plomero de Prueba",
    phone: "+54 11 4750-0001",
    bio: "Destapaciones, pérdidas y termotanques. Urgencias las 24 hs en zona Palomar y alrededores. (Cuenta de prueba)",
    categorySlug: "plomeria",
    location: { lat: -34.5961, lng: -58.5854 }, // ≈ 1,2 km al norte
    approxKm: 1.2,
    serviceRadiusKm: 10,
    isOnline: true, // necesario para probar el despacho urgente
    ratingAvg: 4.8,
    jobsCompleted: 37,
  },
  {
    email: "seed+electricista1@altoque.test",
    fullName: "Electricista de Prueba",
    phone: "+54 11 4750-0002",
    bio: "Instalaciones, tableros y cortocircuitos. Matriculado. Trabajo en Caseros, Palomar y Ciudadela. (Cuenta de prueba)",
    categorySlug: "electricista",
    location: { lat: -34.6069, lng: -58.5472 }, // ≈ 3,5 km al este
    approxKm: 3.5,
    serviceRadiusKm: 12,
    isOnline: true,
    ratingAvg: 4.6,
    jobsCompleted: 21,
  },
  {
    email: "seed+cerrajero1@altoque.test",
    fullName: "Cerrajero de Prueba",
    phone: "+54 11 4750-0003",
    bio: "Aperturas sin romper, cambio de combinaciones y cerraduras de seguridad. (Cuenta de prueba)",
    categorySlug: "cerrajeria",
    location: { lat: -34.6519, lng: -58.6465 }, // ≈ 7,5 km al sudoeste
    approxKm: 7.5,
    serviceRadiusKm: 8, // 7,5 km queda justo adentro: sirve para probar el radio
    isOnline: false, // offline a propósito: no debe aparecer en la variante urgente
    ratingAvg: 4.2,
    jobsCompleted: 12,
  },
];

function fail(step: string, error: unknown): never {
  const message = error instanceof Error ? error.message : JSON.stringify(error);
  console.error(`✖ ${step}: ${message}`);
  process.exit(1);
}

/** La Admin API no busca por email: paginamos y filtramos del lado JS. */
async function findUserByEmail(email: string): Promise<User | null> {
  const perPage = 200;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) fail(`listUsers (página ${page})`, error);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < perPage) return null;
  }
  fail(`findUserByEmail(${email})`, new Error("más de 4000 usuarios; afinar la búsqueda"));
}

async function main() {
  console.log(`Base: ${url}`);
  console.log(`Punto de referencia: ${SEED_POINT.lat}, ${SEED_POINT.lng}\n`);

  // ids de categorías reales (la tabla ya está seedeada con los 8 oficios).
  const slugs = SEED_PROVIDERS.map((p) => p.categorySlug);
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("id, slug, name")
    .in("slug", slugs);
  if (catError) fail("leer categories", catError);
  const categoryBySlug = new Map(
    (categories ?? []).map((c: { id: string; slug: string; name: string }) => [c.slug, c]),
  );
  for (const slug of slugs) {
    if (!categoryBySlug.has(slug)) fail("categorías", new Error(`no existe el slug '${slug}'`));
  }

  const seededIds = new Map<string, string>(); // email → auth user id

  for (const p of SEED_PROVIDERS) {
    console.log(`── ${p.email} (${p.categorySlug}, ~${p.approxKm} km)`);

    // 1) Usuario de auth: crear solo si no existe (idempotencia).
    let userId: string;
    const existing = await findUserByEmail(p.email);
    if (existing) {
      userId = existing.id;
      console.log(`   ya existía (${userId}); re-aplico el perfil`);
    } else {
      const password = `Seed-${randomBytes(9).toString("base64url")}`;
      const { data, error } = await supabase.auth.admin.createUser({
        email: p.email,
        password,
        email_confirm: true,
        // El trigger handle_new_user crea profiles + provider_profiles con esto.
        user_metadata: { role: "provider", full_name: p.fullName, phone: p.phone },
      });
      if (error || !data.user) fail(`createUser ${p.email}`, error ?? new Error("sin user"));
      userId = data.user.id;
      console.log(`   creado (${userId}) — contraseña (solo se muestra ahora): ${password}`);
    }
    seededIds.set(p.email, userId);

    // 2) profiles: el trigger ya la creó; el upsert cubre usuarios pre-existentes
    //    con datos viejos y no duplica.
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      role: "provider",
      full_name: p.fullName,
      phone: p.phone,
    });
    if (profileError) fail(`upsert profiles ${p.email}`, profileError);

    // 3) provider_profiles: aprobado + ubicación (EWKT → geography(Point,4326)).
    const { error: providerError } = await supabase.from("provider_profiles").upsert({
      profile_id: userId,
      bio: p.bio,
      verification_status: "approved",
      base_location: `SRID=4326;POINT(${p.location.lng} ${p.location.lat})`,
      service_radius_km: p.serviceRadiusKm,
      is_online: p.isOnline,
      rating_avg: p.ratingAvg,
      jobs_completed: p.jobsCompleted,
    });
    if (providerError) fail(`upsert provider_profiles ${p.email}`, providerError);

    // 4) Oficio (N:N). ignoreDuplicates = no pisa ni duplica si ya estaba.
    const category = categoryBySlug.get(p.categorySlug);
    if (!category) fail("categorías", new Error(p.categorySlug)); // no pasa: validado arriba
    const { error: pcError } = await supabase.from("provider_categories").upsert(
      { provider_id: userId, category_id: category.id },
      { onConflict: "provider_id,category_id", ignoreDuplicates: true },
    );
    if (pcError) fail(`upsert provider_categories ${p.email}`, pcError);

    console.log(`   ✔ ${category.name} · approved · online=${p.isOnline}`);
  }

  // ── Verificación: find_nearby_providers desde el punto de referencia. ──
  // La función filtra por categoría, así que se consulta una vez por oficio
  // y se juntan los resultados para chequear el orden por cercanía.
  console.log("\nVerificación con find_nearby_providers:");
  type NearbyRow = { provider_id: string; distance_km: number; rating_avg: string | number };
  const found: { email: string; slug: string; distanceKm: number }[] = [];
  for (const p of SEED_PROVIDERS) {
    const category = categoryBySlug.get(p.categorySlug);
    if (!category) continue;
    const { data, error } = await supabase.rpc("find_nearby_providers", {
      p_category: category.id,
      p_lng: SEED_POINT.lng,
      p_lat: SEED_POINT.lat,
      p_limit: 20,
    });
    if (error) fail(`rpc find_nearby_providers (${p.categorySlug})`, error);
    const rows = (data ?? []) as NearbyRow[];
    const row = rows.find((r) => r.provider_id === seededIds.get(p.email));
    if (!row) fail("verificación", new Error(`${p.email} no aparece en la búsqueda`));
    found.push({ email: p.email, slug: p.categorySlug, distanceKm: row.distance_km });
  }

  found.sort((a, b) => a.distanceKm - b.distanceKm);
  for (const f of found) {
    console.log(`   ${f.distanceKm.toFixed(2).padStart(5)} km  ${f.slug.padEnd(12)} ${f.email}`);
  }

  // Variante urgente: solo los online deben aparecer.
  const online: string[] = [];
  for (const p of SEED_PROVIDERS) {
    const category = categoryBySlug.get(p.categorySlug);
    if (!category) continue;
    const { data, error } = await supabase.rpc("find_nearby_online_providers", {
      p_category: category.id,
      p_lng: SEED_POINT.lng,
      p_lat: SEED_POINT.lat,
      p_limit: 20,
    });
    if (error) fail(`rpc find_nearby_online_providers (${p.categorySlug})`, error);
    if (((data ?? []) as NearbyRow[]).length > 0) online.push(p.categorySlug);
  }
  console.log(`   urgentes (online): ${online.join(", ") || "ninguno"}`);

  console.log("\n✔ Seed OK. Limpieza: pnpm seed:test-providers:remove");
}

await main();
