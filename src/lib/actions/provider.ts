"use server";

import { revalidatePath } from "next/cache";
import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { providerProfiles, providerCategories } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { geocodeAddress } from "@/lib/maps/geocode";
import { createServiceClient } from "@/lib/supabase/server";
import { BUCKETS } from "@/lib/storage-buckets";
import {
  providerProfileSchema,
  ACCEPTED_DOC_TYPES,
  MAX_DOC_BYTES,
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

/** Sube DNI + selfie al bucket privado y deja el perfil en estado `pending`. */
export async function uploadVerification(
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return { ok: false, error: "No autorizado." };
  }
  const uid = session.user.id;

  const dni = formData.get("dni");
  const selfie = formData.get("selfie");

  const validation = validateFile(dni, "DNI") ?? validateFile(selfie, "selfie");
  if (validation) return { ok: false, error: validation };

  const dniFile = dni as File;
  const selfieFile = selfie as File;
  const supabase = createServiceClient();
  const stamp = Date.now();

  const dniPath = `${uid}/dni-${stamp}.${EXT[dniFile.type]}`;
  const selfiePath = `${uid}/selfie-${stamp}.${EXT[selfieFile.type]}`;

  const up1 = await supabase.storage
    .from(BUCKETS.verification)
    .upload(dniPath, dniFile, { contentType: dniFile.type, upsert: true });
  const up2 = await supabase.storage
    .from(BUCKETS.verification)
    .upload(selfiePath, selfieFile, {
      contentType: selfieFile.type,
      upsert: true,
    });

  if (up1.error || up2.error) {
    return { ok: false, error: "No se pudieron subir los archivos." };
  }

  await db
    .update(providerProfiles)
    .set({
      idDocumentUrl: dniPath,
      selfieUrl: selfiePath,
      verificationStatus: "pending",
    })
    .where(eq(providerProfiles.profileId, uid));

  revalidatePath("/pro/verificacion");
  revalidatePath("/pro/inicio");
  return { ok: true };
}

function validateFile(file: FormDataEntryValue | null, label: string) {
  if (!(file instanceof File) || file.size === 0) {
    return `Subí el archivo de ${label}.`;
  }
  if (!ACCEPTED_DOC_TYPES.includes(file.type)) {
    return `El ${label} debe ser JPG, PNG, WEBP o PDF.`;
  }
  if (file.size > MAX_DOC_BYTES) {
    return `El ${label} supera el tamaño máximo (6 MB).`;
  }
  return null;
}
