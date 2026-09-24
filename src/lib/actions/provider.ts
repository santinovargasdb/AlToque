"use server";

import { revalidatePath } from "next/cache";
import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  providerProfiles,
  providerCategories,
  categories,
} from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { geocodeAddress } from "@/lib/maps/geocode";
import { createServiceClient } from "@/lib/supabase/server";
import { BUCKETS } from "@/lib/storage-buckets";
import {
  providerProfileSchema,
  requiresLicense,
  validateVerificationFiles,
} from "@/lib/validations/provider";

export type ActionResult = { ok: true } | { ok: false; error: string };

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/** Onboarding/edición del perfil del profesional: oficios, zona, radio, bio. */
export async function updateProviderProfile(
  input: unknown,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return { ok: false, error: "No autorizado." };
  }
  const uid = session.user.id;

  const parsed = providerProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  const data = parsed.data;

  // Resolver coordenadas: del cliente o geocodificando la dirección.
  let lat = data.lat;
  let lng = data.lng;
  if (lat == null || lng == null) {
    const geo = await geocodeAddress(data.addressText);
    if (!geo) {
      return {
        ok: false,
        error:
          "No pudimos ubicar esa dirección. Elegí una sugerencia o usá tu ubicación actual.",
      };
    }
    lat = geo.lat;
    lng = geo.lng;
  }

  await db.transaction(async (tx) => {
    await tx.execute(sql`
      update provider_profiles
      set bio = ${data.bio ?? null},
          years_experience = ${data.yearsExperience ?? null},
          service_radius_km = ${data.serviceRadiusKm},
          base_location = st_setsrid(st_makepoint(${lng}, ${lat}), 4326)
      where profile_id = ${uid}
    `);
    await tx
      .delete(providerCategories)
      .where(eq(providerCategories.providerId, uid));
    await tx.insert(providerCategories).values(
      data.categoryIds.map((categoryId) => ({
        providerId: uid,
        categoryId,
      })),
    );
  });

  revalidatePath("/pro/perfil");
  revalidatePath("/pro/inicio");
  return { ok: true };
}

/**
 * Sube DNI (frente + dorso) + selfie, y matrícula si el oficio la exige,
 * al bucket privado. Deja el perfil en `pending` y limpia el motivo del
 * rechazo anterior (si lo hubo).
 */
export async function uploadVerification(
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return { ok: false, error: "No autorizado." };
  }
  const uid = session.user.id;

  // ¿Exige matrícula? Depende de los oficios cargados en el perfil.
  const trades = await db
    .select({ slug: categories.slug })
    .from(providerCategories)
    .innerJoin(categories, eq(categories.id, providerCategories.categoryId))
    .where(eq(providerCategories.providerId, uid));
  const licenseRequired = requiresLicense(trades.map((t) => t.slug));

  const files = {
    dniFront: formData.get("dniFront"),
    dniBack: formData.get("dniBack"),
    selfie: formData.get("selfie"),
    license: formData.get("license"),
  };
  const validation = validateVerificationFiles(files, { licenseRequired });
  if (validation) return { ok: false, error: validation };

  const supabase = createServiceClient();
  const stamp = Date.now();

  const uploads: Array<{ file: File; path: string }> = [
    { file: files.dniFront as File, path: `${uid}/dni-frente-${stamp}` },
    { file: files.dniBack as File, path: `${uid}/dni-dorso-${stamp}` },
    { file: files.selfie as File, path: `${uid}/selfie-${stamp}` },
  ];
  const hasLicense = files.license instanceof File && files.license.size > 0;
  if (hasLicense) {
    uploads.push({
      file: files.license as File,
      path: `${uid}/matricula-${stamp}`,
    });
  }

  const paths: string[] = [];
  for (const u of uploads) {
    const fullPath = `${u.path}.${EXT[u.file.type]}`;
    const { error } = await supabase.storage
      .from(BUCKETS.verification)
      .upload(fullPath, u.file, { contentType: u.file.type, upsert: true });
    if (error) {
      return { ok: false, error: "No se pudieron subir los archivos." };
    }
    paths.push(fullPath);
  }

  await db
    .update(providerProfiles)
    .set({
      idDocumentUrl: paths[0],
      idDocumentBackUrl: paths[1],
      selfieUrl: paths[2],
      licenseUrl: hasLicense ? paths[3] : null,
      verificationStatus: "pending",
      rejectionReason: null,
    })
    .where(eq(providerProfiles.profileId, uid));

  revalidatePath("/pro/verificacion");
  revalidatePath("/pro/inicio");
  return { ok: true };
}
