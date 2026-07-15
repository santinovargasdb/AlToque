import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import type { EmailOtpType, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles, providerProfiles } from "@/lib/db/schema";
import { authCallbackParamsSchema } from "@/lib/validations/auth";

/**
 * Ventana en la que un usuario se considera "recién registrado" para aplicar
 * la intención de rol del OAuth (?role=provider). Fuera de esta ventana el
 * param se ignora: una cuenta existente jamás cambia de rol por loguearse.
 */
const NEW_SIGNUP_WINDOW_MS = 10 * 60 * 1000;

/**
 * Base URL real para las redirecciones del callback.
 *
 * En producción detrás del proxy de Vercel, `request.nextUrl.origin` puede
 * resolver a `localhost:3000` (el host interno del runtime). Por eso:
 *  - dev → origin local (correcto).
 *  - prod → `x-forwarded-host` + `x-forwarded-proto` (el host público real),
 *    con NEXT_PUBLIC_APP_URL como último fallback.
 */
function resolveBaseUrl(request: NextRequest): string {
  if (process.env.NODE_ENV === "development") return request.nextUrl.origin;

  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${forwardedHost}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
}

/** ¿El usuario se creó dentro de la ventana de signup nuevo? */
function isRecentSignup(user: User): boolean {
  const createdAt = Date.parse(user.created_at);
  return (
    Number.isFinite(createdAt) && Date.now() - createdAt < NEW_SIGNUP_WINDOW_MS
  );
}

/**
 * Aplica la intención de registro como profesional de un signup vía OAuth
 * (Google no puede mandar `role` en los metadatos, así que el trigger
 * `handle_new_user` creó el perfil como 'client' sin `provider_profiles`).
 *
 * Guardas: solo signups recién creados Y con rol 'client' vigente. Después
 * de promover, refresca la sesión para que el Custom Access Token Hook
 * re-emita el JWT con `user_role='provider'` (si el refresh falla, el
 * middleware igual resuelve el rol desde la DB en el peor caso).
 */
async function promoteOAuthSignupToProvider(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isRecentSignup(user)) return;

  const [profile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  if (profile?.role !== "client") return;

  await db.transaction(async (tx) => {
    await tx
      .update(profiles)
      .set({ role: "provider" })
      .where(eq(profiles.id, user.id));
    await tx
      .insert(providerProfiles)
      .values({ profileId: user.id })
      .onConflictDoNothing();
  });

  const { error } = await supabase.auth.refreshSession();
  if (error) {
    console.error("auth/callback: fallo el refresh post-promoción", error);
  }
}

/**
 * Callback de Supabase Auth para TODOS los flujos de entrada:
 *  - OAuth (Google) y magic links vía PKCE (`?code=`),
 *  - confirmación por email / recovery vía `?token_hash=&type=`,
 *  - errores del proveedor (`?error=&error_description=`).
 *
 * Query params validados con Zod (`authCallbackParamsSchema`): `next` solo
 * acepta rutas internas (anti open redirect) y `role` solo client|provider.
 * Tras autenticar redirige a `next` sobre la base URL pública real.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const base = resolveBaseUrl(request);

  // El proveedor OAuth puede volver con error (ej. el usuario canceló el
  // consentimiento en Google). Se informa amigablemente en /ingresar.
  if (searchParams.get("error")) {
    const description = searchParams.get("error_description");
    console.error(
      `auth/callback: error del proveedor: ${searchParams.get("error")} — ${description}`,
    );
    const friendly =
      searchParams.get("error") === "access_denied"
        ? "Cancelaste el ingreso con Google. Probá de nuevo."
        : "No pudimos completar el ingreso. Probá de nuevo.";
    return NextResponse.redirect(
      `${base}/ingresar?error=${encodeURIComponent(friendly)}`,
    );
  }

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const { next, role } = authCallbackParamsSchema.parse({
    next: searchParams.get("next") ?? "/inicio",
    role: searchParams.get("role"),
  });

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Registro como profesional vía Google: promover ANTES de redirigir,
      // para que el middleware enrute a /pro con el claim correcto.
      if (role === "provider") {
        await promoteOAuthSignupToProvider(supabase);
      }
      return NextResponse.redirect(`${base}${next}`);
    }
    console.error("auth/callback: exchangeCodeForSession falló", error);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      // Un link de recovery siempre debe aterrizar en el form de contraseña.
      const dest = type === "recovery" ? "/restablecer" : next;
      return NextResponse.redirect(`${base}${dest}`);
    }
    console.error("auth/callback: verifyOtp falló", error);
  }

  return NextResponse.redirect(
    `${base}/ingresar?error=No%20se%20pudo%20verificar%20el%20enlace`,
  );
}
