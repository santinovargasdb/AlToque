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
    {
      realtime: {
        // supabase-js ignora INITIAL_SESSION en _handleTokenChanged, así que el
        // JOIN inicial puede salir sin JWT. Con accessToken como callback, el
        // RealtimeClient llama esta función en la respuesta 'ok' de cada JOIN y
        // en cada heartbeat, enviando el token al server para que re-evalúe RLS.
        accessToken: async () => {
          const { data } = await _client!.auth.getSession();
          return data.session?.access_token ?? null;
        },
      },
    },
  );

  return _client;
}
