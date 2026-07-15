import "server-only";
import { headers } from "next/headers";

/**
 * Origen real de la request actual, apto para construir URLs absolutas
 * (emailRedirectTo de Supabase, back_urls, etc.).
 *
 * Detrás del proxy de Vercel el host "visto" por Node puede ser interno
 * (localhost:3000), por eso se prioriza `x-forwarded-host`/`x-forwarded-proto`.
 * Fallbacks: `host` → NEXT_PUBLIC_APP_URL → localhost (dev).
 */
export async function getRequestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto =
      h.get("x-forwarded-proto") ??
      (host.startsWith("localhost") || host.startsWith("127.")
        ? "http"
        : "https");
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
