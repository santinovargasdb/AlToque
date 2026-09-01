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

  // supabase-js's internal _listenForAuthEvents sólo maneja TOKEN_REFRESHED y SIGNED_IN,
  // no INITIAL_SESSION (sesión existente al cargar la página). Este listener llena ese gap:
  // garantiza que el WebSocket Realtime tenga el JWT antes de que los canales hagan JOIN,
  // para que los eventos de postgres_changes pasen los checks de RLS.
  _client.auth.onAuthStateChange((_, session) => {
    _client?.realtime.setAuth(session?.access_token ?? null);
  });

  return _client;
}
