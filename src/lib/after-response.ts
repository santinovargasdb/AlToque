import "server-only";
import { after } from "next/server";

/**
 * Corre `task` cuando termina la respuesta, sin demorarla. En Vercel, lo que
 * queda colgando después de responder se puede cortar: `after()` le avisa a la
 * plataforma que espere. Corre aunque la acción haga `redirect` o lance un error.
 * Fuera de una request (scripts, tests) `after()` lanza: ahí corre directamente.
 */
export function afterResponse(task: () => Promise<unknown>): void {
  try {
    after(task);
  } catch {
    void task();
  }
}
