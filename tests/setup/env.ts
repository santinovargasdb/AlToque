/**
 * Setup global de Vitest. Cuando hay una DB de test (`TEST_DATABASE_URL`),
 * apuntamos el singleton de la app (`@/lib/db`, que lee `DATABASE_URL` vía
 * `@/lib/env` al importarse) a esa base y completamos el resto de env
 * requeridas con placeholders para que la validación Zod de `lib/env.ts` pase.
 *
 * Sin `TEST_DATABASE_URL` no toca nada: los tests que necesitan DB se saltan.
 */
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
}
