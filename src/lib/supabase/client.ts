import { createBrowserClient } from "@supabase/ssr";

type BrowserClient = ReturnType<typeof createBrowserClient>;

let _client: BrowserClient | undefined;

/**
 * Cliente Supabase para el navegador (Client Components).
 * Auth + Realtime + Storage públicos. Nunca usar la service_role acá.
 */
export function createClient() {
  if (_client) return _client;
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return _client;
}
