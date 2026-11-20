import { NextResponse } from "next/server";
import { parseAssetLinksConfig } from "@/lib/android/asset-links";

/**
 * Digital Asset Links: le confirma a Android que la app publicada en Google
 * Play (Trusted Web Activity) es de este mismo sitio, para que abra sin la
 * barra del navegador. Sin las variables configuradas responde una lista
 * vacía, que es un archivo válido.
 */
export function GET() {
  const config = parseAssetLinksConfig(
    process.env.ANDROID_PACKAGE_NAME,
    process.env.ANDROID_SHA256_FINGERPRINTS,
  );

  const body = config
    ? [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: config.packageName,
            sha256_cert_fingerprints: config.fingerprints,
          },
        },
      ]
    : [];

  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
