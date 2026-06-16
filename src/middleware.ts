import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

type Role = "client" | "provider" | "admin";

// Home por rol (a dónde mandar si entra a una zona que no le corresponde).
const HOME: Record<Role, string> = {
  client: "/inicio",
  provider: "/pro/inicio",
  admin: "/admin",
};

// Prefijos públicos (sin auth). El resto se protege según el segmento.
const PUBLIC_PREFIXES = [
  "/",
  "/como-funciona",
  "/para-profesionales",
  "/categorias",
  "/ingresar",
  "/registro",
];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (p) => p !== "/" && (pathname === p || pathname.startsWith(`${p}/`)),
  );
}

// Qué rol exige cada zona protegida (los route groups no aparecen en la URL).
function requiredRole(pathname: string): Role | null {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (pathname === "/pro" || pathname.startsWith("/pro/")) return "provider";
  // Zona cliente (app).
  const clientPrefixes = [
    "/inicio",
    "/buscar",
    "/profesional",
    "/pedido",
    "/pedidos",
    "/mensajes",
    "/perfil",
  ];
  if (clientPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`)))
    return "client";
  return null;
}

/** Lee el claim `user_role` del JWT sin verificar firma (solo para routing). */
function roleFromToken(accessToken: string | undefined): Role | null {
  if (!accessToken) return null;
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { user_role?: Role };
    return json.user_role ?? null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const needed = requiredRole(pathname);

  // Ruta pública o sin requerimiento de rol → seguir.
  if (!needed || isPublic(pathname)) return response;

  // Protegida sin sesión → a login con returnUrl.
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/ingresar";
    url.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Resolver rol: primero del JWT claim; si falta, consultar profiles.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  let role = roleFromToken(session?.access_token);
  if (!role) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = (data?.role as Role | undefined) ?? "client";
  }

  // Rol no coincide con la zona → a su home.
  if (role !== needed) {
    const url = request.nextUrl.clone();
    url.pathname = HOME[role];
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Todo excepto assets estáticos, imágenes Next y el service worker.
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|sw.js|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
