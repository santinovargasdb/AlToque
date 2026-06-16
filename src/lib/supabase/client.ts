import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para el navegador (Client Components).
 * Auth + Realtime + Storage públicos. Nunca usar la service_role acá.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
