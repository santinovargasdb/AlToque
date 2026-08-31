/**
 * ════════════════════════════════════════════════════════════════
 * Seed de 24 profesionales de PRUEBA para AlToque.
 *
 * ⚠️  SOLO PARA DEV / STAGING. El script aborta si detecta la base
 *     de producción (ref kjscohighnukjcyztqfi / pooler aws-1) y
 *     exige la confirmación SEED_CONFIRM=yes-i-know.
 *
 * Password uniforme: Test1234!
 * (Solo para login manual durante el desarrollo — NUNCA en prod.)
 *
 * Uso:
 *   SEED_CONFIRM=yes-i-know pnpm seed:providers
 *
 * Idempotente: podés correrlo N veces sin duplicar usuarios.
 * Limpieza: Supabase → Authentication → Users → filtrar @altoque.test,
 *   o borrá con Admin API. OJO: si tienen jobs/reviews asociados la FK
 *   bloquea el borrado de profiles — eliminá esos registros primero.
 * ════════════════════════════════════════════════════════════════
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
config();

// ── Guardia de producción ────────────────────────────────────────────────────
const PROD_MARKERS = ["kjscohighnukjcyztqfi", "aws-1"];
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const DB_URL = process.env.DATABASE_URL ?? "";

const isProd = PROD_MARKERS.some((m) => SUPA_URL.includes(m) || DB_URL.includes(m));
if (isProd && process.env.SEED_ALLOW_PROD !== "yes-prod") {
  console.error(
    "❌  Detecté una base de PRODUCCIÓN (marcadores: kjscohighnukjcyztqfi / aws-1).\n" +
      "    Para correrlo igualmente agregá SEED_ALLOW_PROD=yes-prod al comando.",
  );
  process.exit(1);
}
if (isProd) {
  console.warn("⚠️  Corriendo contra PRODUCCIÓN (SEED_ALLOW_PROD=yes-prod).\n");
}

if (process.env.SEED_CONFIRM !== "yes-i-know") {
  console.error(
    "❌  Falta SEED_CONFIRM=yes-i-know.\n" +
      "    Ejemplo: SEED_CONFIRM=yes-i-know pnpm seed:providers",
  );
  process.exit(1);
}

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !serviceRoleKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local",
  );
  process.exit(1);
}

const supabase = createClient(SUPA_URL, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Zonas ────────────────────────────────────────────────────────────────────
const ZONES = {
  palermo:       { lat: -34.5875, lng: -58.4204, label: "Palermo" },
  belgrano:      { lat: -34.5627, lng: -58.4583, label: "Belgrano" },
  caballito:     { lat: -34.6187, lng: -58.4402, label: "Caballito" },
  flores:        { lat: -34.6280, lng: -58.4640, label: "Flores" },
  villa_urquiza: { lat: -34.5729, lng: -58.4881, label: "Villa Urquiza" },
  almagro:       { lat: -34.6100, lng: -58.4200, label: "Almagro" },
  san_isidro:    { lat: -34.4707, lng: -58.5121, label: "San Isidro" },
  vicente_lopez: { lat: -34.5266, lng: -58.4784, label: "Vicente López" },
} as const;

type ZoneKey = keyof typeof ZONES;

// Jitter determinístico por índice (±0.005° ≈ ±500 m); mismo valor en cada corrida.
const JITTER_LAT = [
   0.0032,  0.0015, -0.0041,  0.0018, -0.0027,  0.0039,
  -0.0012,  0.0044, -0.0033,  0.0021,  0.0048, -0.0019,
   0.0037, -0.0024,  0.0013, -0.0043,  0.0028,  0.0045,
  -0.0016,  0.0042, -0.0031,  0.0019,  0.0036, -0.0022,
];
const JITTER_LNG = [
  -0.0027,  0.0041, -0.0013,  0.0038, -0.0044,  0.0016,
   0.0033, -0.0018,  0.0047, -0.0029,  0.0012, -0.0039,
   0.0024, -0.0048,  0.0035,  0.0011, -0.0042,  0.0026,
  -0.0037,  0.0043, -0.0015,  0.0048, -0.0023,  0.0031,
];

// ── Definición de proveedores ─────────────────────────────────────────────────
type ProviderDef = {
  email: string;
  fullName: string;
  phone: string;
  bio: string;
  zone: ZoneKey;
  primarySlug: string;
  secondarySlug?: string;
  isOnline: boolean;
  serviceRadiusKm: number;
  yearsExperience: number;
  ratingAvg: number;
  jobsCompleted: number;
};

const PROVIDERS: ProviderDef[] = [
  // ── Plomería (3) — al menos 2 online ────────────────────────────────────────
  {
    email: "pro01-plomeria@altoque.test",
    fullName: "Juan Pérez",
    phone: "+54 9 11 5555-0001",
    bio: "Destapaciones, pérdidas, termotanques y pluviales. Urgencias 24hs en Palermo y alrededores.",
    zone: "palermo",
    primarySlug: "plomeria",
    secondarySlug: "gasista", // también habilitado como gasista
    isOnline: true,
    serviceRadiusKm: 10,
    yearsExperience: 8,
    ratingAvg: 4.8,
    jobsCompleted: 37,
  },
  {
    email: "pro02-plomeria@altoque.test",
    fullName: "María González",
    phone: "+54 9 11 5555-0002",
    bio: "Destapes, reparación de cañerías y sanitarios. Trabajo prolijo con garantía. Caballito.",
    zone: "caballito",
    primarySlug: "plomeria",
    isOnline: true,
    serviceRadiusKm: 12,
    yearsExperience: 12,
    ratingAvg: 4.6,
    jobsCompleted: 52,
  },
  {
    email: "pro03-plomeria@altoque.test",
    fullName: "Carlos Rodríguez",
    phone: "+54 9 11 5555-0003",
    bio: "Fontanería general y obras. Zona Flores y Liniers.",
    zone: "flores",
    primarySlug: "plomeria",
    isOnline: false,
    serviceRadiusKm: 8,
    yearsExperience: 5,
    ratingAvg: 4.3,
    jobsCompleted: 18,
  },

  // ── Cerrajería (3) ───────────────────────────────────────────────────────────
  {
    email: "pro01-cerrajeria@altoque.test",
    fullName: "Ana Martínez",
    phone: "+54 9 11 5555-0004",
    bio: "Aperturas sin rotura, cambio de cerraduras y combinaciones. Belgrano y zona norte.",
    zone: "belgrano",
    primarySlug: "cerrajeria",
    isOnline: true,
    serviceRadiusKm: 8,
    yearsExperience: 6,
    ratingAvg: 4.9,
    jobsCompleted: 63,
  },
  {
    email: "pro02-cerrajeria@altoque.test",
    fullName: "Pablo López",
    phone: "+54 9 11 5555-0005",
    bio: "Cerrajería residencial y comercial. 15 años en el oficio, atención inmediata. Villa Urquiza.",
    zone: "villa_urquiza",
    primarySlug: "cerrajeria",
    isOnline: true,
    serviceRadiusKm: 10,
    yearsExperience: 15,
    ratingAvg: 4.7,
    jobsCompleted: 71,
  },
  {
    email: "pro03-cerrajeria@altoque.test",
    fullName: "Lucía García",
    phone: "+54 9 11 5555-0006",
    bio: "Apertura de cajas de seguridad y cerraduras alta gama. Zona Almagro.",
    zone: "almagro",
    primarySlug: "cerrajeria",
    isOnline: false,
    serviceRadiusKm: 6,
    yearsExperience: 3,
    ratingAvg: 4.2,
    jobsCompleted: 12,
  },

  // ── Electricista (3) ─────────────────────────────────────────────────────────
  {
    email: "pro01-electricista@altoque.test",
    fullName: "Diego Fernández",
    phone: "+54 9 11 5555-0007",
    bio: "Instalaciones, tableros, iluminación y cortocircuitos. Matriculado MTE. Palermo y CABA.",
    zone: "palermo",
    primarySlug: "electricista",
    secondarySlug: "techista", // también habilitado como techista
    isOnline: true,
    serviceRadiusKm: 15,
    yearsExperience: 10,
    ratingAvg: 4.8,
    jobsCompleted: 45,
  },
  {
    email: "pro02-electricista@altoque.test",
    fullName: "Valeria Romero",
    phone: "+54 9 11 5555-0008",
    bio: "Electricidad domiciliaria y baja tensión. Matriculada. San Isidro y zona norte GBA.",
    zone: "san_isidro",
    primarySlug: "electricista",
    isOnline: true,
    serviceRadiusKm: 12,
    yearsExperience: 7,
    ratingAvg: 4.5,
    jobsCompleted: 29,
  },
  {
    email: "pro03-electricista@altoque.test",
    fullName: "Matías Sánchez",
    phone: "+54 9 11 5555-0009",
    bio: "Reparaciones eléctricas y automatizaciones. Vicente López y Olivos.",
    zone: "vicente_lopez",
    primarySlug: "electricista",
    isOnline: false,
    serviceRadiusKm: 8,
    yearsExperience: 4,
    ratingAvg: 4.1,
    jobsCompleted: 9,
  },

  // ── Gasista (3) ──────────────────────────────────────────────────────────────
  {
    email: "pro01-gasista@altoque.test",
    fullName: "Sofía Díaz",
    phone: "+54 9 11 5555-0010",
    bio: "Instalaciones de gas, calderas, termotanques y verificaciones habilitantes. Matriculada ENARGAS.",
    zone: "caballito",
    primarySlug: "gasista",
    isOnline: true,
    serviceRadiusKm: 10,
    yearsExperience: 9,
    ratingAvg: 4.9,
    jobsCompleted: 58,
  },
  {
    email: "pro02-gasista@altoque.test",
    fullName: "Martín Torres",
    phone: "+54 9 11 5555-0011",
    bio: "Reparación y habilitación de artefactos a gas. Flores, Parque Avellaneda y zona oeste.",
    zone: "flores",
    primarySlug: "gasista",
    isOnline: true,
    serviceRadiusKm: 12,
    yearsExperience: 14,
    ratingAvg: 4.7,
    jobsCompleted: 66,
  },
  {
    email: "pro03-gasista@altoque.test",
    fullName: "Carina Flores",
    phone: "+54 9 11 5555-0012",
    bio: "Gasfitería y gas natural. Zona Almagro y Balvanera.",
    zone: "almagro",
    primarySlug: "gasista",
    isOnline: false,
    serviceRadiusKm: 8,
    yearsExperience: 6,
    ratingAvg: 4.3,
    jobsCompleted: 22,
  },

  // ── Techista (3) ─────────────────────────────────────────────────────────────
  {
    email: "pro01-techista@altoque.test",
    fullName: "Rodrigo Alonso",
    phone: "+54 9 11 5555-0013",
    bio: "Impermeabilizaciones, filtraciones y reparación de techos. Presupuesto sin cargo. Belgrano.",
    zone: "belgrano",
    primarySlug: "techista",
    isOnline: true,
    serviceRadiusKm: 15,
    yearsExperience: 11,
    ratingAvg: 4.8,
    jobsCompleted: 41,
  },
  {
    email: "pro02-techista@altoque.test",
    fullName: "Natalia Ruiz",
    phone: "+54 9 11 5555-0014",
    bio: "Membranas, impermeabilizante y pintura de techos. Palermo, Recoleta y zona norte.",
    zone: "palermo",
    primarySlug: "techista",
    isOnline: true,
    serviceRadiusKm: 12,
    yearsExperience: 8,
    ratingAvg: 4.6,
    jobsCompleted: 33,
  },
  {
    email: "pro03-techista@altoque.test",
    fullName: "Fernando Méndez",
    phone: "+54 9 11 5555-0015",
    bio: "Techista con experiencia en ZAC y membrana. Villa Urquiza y Saavedra.",
    zone: "villa_urquiza",
    primarySlug: "techista",
    isOnline: false,
    serviceRadiusKm: 10,
    yearsExperience: 5,
    ratingAvg: 4.2,
    jobsCompleted: 15,
  },

  // ── Carpintería (3) ──────────────────────────────────────────────────────────
  {
    email: "pro01-carpinteria@altoque.test",
    fullName: "Mónica Castro",
    phone: "+54 9 11 5555-0016",
    bio: "Muebles a medida, placard y reparaciones. Madera sólida y melamina. San Isidro.",
    zone: "san_isidro",
    primarySlug: "carpinteria",
    isOnline: true,
    serviceRadiusKm: 10,
    yearsExperience: 16,
    ratingAvg: 4.9,
    jobsCompleted: 78,
  },
  {
    email: "pro02-carpinteria@altoque.test",
    fullName: "Alejandro Vargas",
    phone: "+54 9 11 5555-0017",
    bio: "Carpintería general, restauración y encastres. Vicente López y zona norte.",
    zone: "vicente_lopez",
    primarySlug: "carpinteria",
    isOnline: true,
    serviceRadiusKm: 12,
    yearsExperience: 12,
    ratingAvg: 4.7,
    jobsCompleted: 55,
  },
  {
    email: "pro03-carpinteria@altoque.test",
    fullName: "Patricia Moreno",
    phone: "+54 9 11 5555-0018",
    bio: "Reparaciones y herrajes. Caballito, Flores y zona oeste.",
    zone: "caballito",
    primarySlug: "carpinteria",
    isOnline: false,
    serviceRadiusKm: 8,
    yearsExperience: 7,
    ratingAvg: 4.4,
    jobsCompleted: 24,
  },

  // ── Pintor (3) ───────────────────────────────────────────────────────────────
  {
    email: "pro01-pintor@altoque.test",
    fullName: "Nicolás Herrera",
    phone: "+54 9 11 5555-0019",
    bio: "Pintura interior y exterior, enduido y texturado. Materiales incluidos. Almagro y CABA.",
    zone: "almagro",
    primarySlug: "pintor",
    isOnline: true,
    serviceRadiusKm: 10,
    yearsExperience: 9,
    ratingAvg: 4.8,
    jobsCompleted: 49,
  },
  {
    email: "pro02-pintor@altoque.test",
    fullName: "Claudia Aguilar",
    phone: "+54 9 11 5555-0020",
    bio: "Pintura decorativa, esmaltes y lacas. Belgrano, Núñez y Colegiales.",
    zone: "belgrano",
    primarySlug: "pintor",
    isOnline: true,
    serviceRadiusKm: 8,
    yearsExperience: 6,
    ratingAvg: 4.5,
    jobsCompleted: 27,
  },
  {
    email: "pro03-pintor@altoque.test",
    fullName: "Sebastián Ponce",
    phone: "+54 9 11 5555-0021",
    bio: "Pintura de frentes y trabajos de altura. Flores y zona sur.",
    zone: "flores",
    primarySlug: "pintor",
    isOnline: false,
    serviceRadiusKm: 6,
    yearsExperience: 4,
    ratingAvg: 4.0,
    jobsCompleted: 8,
  },

  // ── Albañil (3) ──────────────────────────────────────────────────────────────
  {
    email: "pro01-albanil@altoque.test",
    fullName: "Graciela Vega",
    phone: "+54 9 11 5555-0022",
    bio: "Reformas, ampliaciones y reparaciones. 20 años en el oficio. Vicente López y GBA norte.",
    zone: "vicente_lopez",
    primarySlug: "albanil",
    isOnline: true,
    serviceRadiusKm: 12,
    yearsExperience: 20,
    ratingAvg: 4.9,
    jobsCompleted: 80,
  },
  {
    email: "pro02-albanil@altoque.test",
    fullName: "Leandro Cruz",
    phone: "+54 9 11 5555-0023",
    bio: "Obra seca, terminaciones y reparaciones. San Isidro, Martínez y zona norte.",
    zone: "san_isidro",
    primarySlug: "albanil",
    isOnline: true,
    serviceRadiusKm: 15,
    yearsExperience: 13,
    ratingAvg: 4.7,
    jobsCompleted: 61,
  },
  {
    email: "pro03-albanil@altoque.test",
    fullName: "Silvina Molina",
    phone: "+54 9 11 5555-0024",
    bio: "Albañilería general y solados. Palermo y Recoleta.",
    zone: "palermo",
    primarySlug: "albanil",
    isOnline: false,
    serviceRadiusKm: 10,
    yearsExperience: 8,
    ratingAvg: 4.3,
    jobsCompleted: 19,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

type SupaUser = { id: string; email?: string };

function fail(step: string, error: unknown): never {
  const msg = error instanceof Error ? error.message : JSON.stringify(error);
  console.error(`\n✖ ${step}: ${msg}`);
  process.exit(1);
}

async function findUserByEmail(email: string): Promise<SupaUser | null> {
  const perPage = 200;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) fail(`listUsers (pág ${page})`, error);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < perPage) return null;
  }
  fail("findUserByEmail", new Error("más de 4000 usuarios — paginación insuficiente"));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nAlToque — Seed de profesionales de prueba`);
  console.log(`Base: ${SUPA_URL}`);
  console.log(`Total: ${PROVIDERS.length} profesionales (3 × 8 oficios)\n`);

  // Cargar IDs de categorías (la tabla ya está seedeada con los 8 oficios)
  const allSlugs = [
    ...new Set(
      PROVIDERS.flatMap((p) =>
        [p.primarySlug, p.secondarySlug].filter(Boolean) as string[],
      ),
    ),
  ];
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("id, slug")
    .in("slug", allSlugs);
  if (catError) fail("leer categories", catError);

  type CatRow = { id: string; slug: string };
  const catMap = new Map<string, string>(
    (categories as CatRow[]).map((c) => [c.slug, c.id]),
  );
  for (const slug of allSlugs) {
    if (!catMap.has(slug))
      fail("categories", new Error(`slug '${slug}' no existe en la DB`));
  }

  // Seed de cada profesional
  type TableRow = { email: string; oficio: string; zona: string; online: string };
  const tableRows: TableRow[] = [];

  for (const [idx, p] of PROVIDERS.entries()) {
    const zone = ZONES[p.zone];
    const lat = zone.lat + (JITTER_LAT[idx] ?? 0);
    const lng = zone.lng + (JITTER_LNG[idx] ?? 0);
    const locationEwkt = `SRID=4326;POINT(${lng} ${lat})`;

    process.stdout.write(`[${String(idx + 1).padStart(2, "0")}/24] ${p.email} … `);

    // 1) auth.users — solo crea si no existe (idempotente)
    let userId: string;
    const existing = await findUserByEmail(p.email);
    if (existing) {
      userId = existing.id;
      process.stdout.write("ya existía\n");
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: p.email,
        password: "Test1234!",
        email_confirm: true,
        user_metadata: {
          role: "provider",
          full_name: p.fullName,
          phone: p.phone,
        },
      });
      if (error || !data.user)
        fail(`createUser ${p.email}`, error ?? new Error("sin user"));
      userId = data.user.id;
      process.stdout.write("creado\n");
    }

    // 2) profiles — el trigger handle_new_user ya la creó; upsert cubre re-corridas
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      role: "provider",
      full_name: p.fullName,
      phone: p.phone,
    });
    if (profileError) fail(`upsert profiles ${p.email}`, profileError);

    // 3) provider_profiles — ubicación como EWKT que Postgres interpreta como geography(Point,4326)
    const { error: providerError } = await supabase
      .from("provider_profiles")
      .upsert({
        profile_id: userId,
        bio: p.bio,
        verification_status: "approved",
        base_location: locationEwkt,
        service_radius_km: p.serviceRadiusKm,
        is_online: p.isOnline,
        rating_avg: p.ratingAvg,
        jobs_completed: p.jobsCompleted,
        years_experience: p.yearsExperience,
      });
    if (providerError) fail(`upsert provider_profiles ${p.email}`, providerError);

    // 4) provider_categories — primario + secundario (si tiene)
    const slugsToLink = [p.primarySlug, p.secondarySlug].filter(
      Boolean,
    ) as string[];
    for (const slug of slugsToLink) {
      const categoryId = catMap.get(slug)!;
      const { error: pcError } = await supabase
        .from("provider_categories")
        .upsert(
          { provider_id: userId, category_id: categoryId },
          { onConflict: "provider_id,category_id", ignoreDuplicates: true },
        );
      if (pcError) fail(`upsert provider_categories ${p.email} (${slug})`, pcError);
    }

    const oficioLabel =
      p.primarySlug + (p.secondarySlug ? `+${p.secondarySlug}` : "");
    tableRows.push({
      email: p.email,
      oficio: oficioLabel,
      zona: zone.label,
      online: p.isOnline ? "sí" : "no",
    });
  }

  // ── Tabla resumen ─────────────────────────────────────────────────────────────
  const SEP = "─".repeat(82);
  console.log(`\n${SEP}`);
  console.log(
    "  Email".padEnd(36) +
      "Oficio".padEnd(24) +
      "Zona".padEnd(16) +
      "Online",
  );
  console.log(SEP);
  for (const r of tableRows) {
    console.log(
      `  ${r.email.padEnd(34)}${r.oficio.padEnd(24)}${r.zona.padEnd(16)}${r.online}`,
    );
  }
  console.log(SEP);
  console.log(
    `\n✔ Seed OK: ${PROVIDERS.length} profesionales creados/actualizados.`,
  );
  console.log(`  Password: Test1234!`);
  console.log(
    `  Para limpiar: Supabase → Authentication → Users → filtrar "@altoque.test".\n`,
  );
}

await main();
