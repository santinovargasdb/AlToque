import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

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

/**
 * Callback de Supabase Auth para magic links / confirmación por email /
 * recuperación de contraseña. Soporta el flujo PKCE (`?code=`) y el de
 * token_hash (`?token_hash=&type=`). Tras autenticar, redirige a `next`
 * (validado como ruta interna: evita open redirect vía `//dominio`).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const base = resolveBaseUrl(request);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/inicio";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${base}${next}`);
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
  }

  return NextResponse.redirect(
    `${base}/ingresar?error=No%20se%20pudo%20verificar%20el%20enlace`,
  );
}
