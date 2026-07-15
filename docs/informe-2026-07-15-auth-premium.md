# Informe — Auth premium: UX, huérfanos, multiproveedor y logout global (2026-07-15)

Continúa `informe-2026-07-15-google-auth-ux.md`.
Verificación: `pnpm typecheck` ✅ · `pnpm lint` ✅ · `pnpm test` ✅ (59 tests) · `pnpm build` ✅.

## Tarea 1 — Microinteracciones y skeleton loaders

Sin dependencias nuevas: el proyecto ya trae `tw-animate-css` importado en
`globals.css`, así que todo es CSS/Tailwind (no hizo falta Framer Motion).

| Archivo | Cambio |
|---|---|
| `src/app/(auth)/layout.tsx` | Card de auth con entrada `animate-in fade-in slide-in-from-bottom-2 duration-300`. |
| `src/components/auth/login-flow.tsx` / `registro-flow.tsx` | El form se remonta con `key={method}` → transición suave al alternar contraseña/OTP. |
| `src/components/auth/oauth-button.tsx` | `transition-all` + `hover:shadow-md` + `active:scale-[0.98]` + swap de texto "Conectando con {proveedor}…" durante la redirección. |
| `src/components/ui/skeleton.tsx` **(nuevo)** | Bloque fantasma pulsante reutilizable. |
| `src/app/(auth)/completar-perfil/loading.tsx`, `src/app/(app)/perfil/loading.tsx`, `src/app/(pro)/pro/perfil/loading.tsx` **(nuevos)** | Skeletons por ruta (App Router `loading.tsx`): se muestran mientras el server valida sesión/consulta datos, espejando la geometría real → CLS ≈ 0. |
| `src/components/auth/google-account-link.tsx` | La carga de identidades ahora muestra una fila skeleton idéntica a la final (antes, texto que saltaba). |

## Tarea 2 — Limpieza de cuentas huérfanas (Drizzle)

`src/lib/db/maintenance.ts` **(nuevo)**:

- `findOrphanProfiles({ olderThanHours=48, limit })` — Drizzle puro: perfiles con
  `full_name` o `phone` vacíos (onboarding nunca completado) creados hace >48 h,
  **sin actividad** (`notExists` de jobs como cliente o profesional) y no-admin.
- `purgeOrphanProfiles({ dryRun=true })` — por cada candidato consulta la **Admin
  API** (service_role) y solo purga si `app_metadata.providers` incluye un proveedor
  OAuth (google/apple/github) — el criterio "creados mediante OAuth" no es visible
  desde la DB mapeada. Borra `auth.users` (Admin API) y luego `profiles` (cascada a
  provider_profiles/notifications/push_subscriptions). Devuelve `{scanned, purged,
  skipped[{id, reason}], dryRun}`.

Proceso de mantenimiento: `GET /api/cron/cleanup-orphans` **(nuevo)**, protegido por
`CRON_SECRET`, agendado **diario 01:00** en `vercel.json`. **Seguro por defecto**:
solo lista (dry-run); el borrado real exige `ORPHAN_PURGE_ENABLED="true"` en env o
una corrida manual con `?purge=1`.

## Tarea 3 — Estructura multiproveedor (OAuthButton)

`src/components/auth/oauth-button.tsx` **(nuevo)** reemplaza a `google-button.tsx`
**(eliminado)**: componente genérico `OAuthButton({ provider, redirectTo, role?,
label? })` con un registry `PROVIDERS: Record<OAuthProviderId, ProviderBranding>`
(nombre, clases del branding oficial y logo SVG) para `google`, `apple` y `github`.
`signInWithOAuth({ provider })` es dinámico y el resto del flujo (callback →
promoción de rol → onboarding) ya era agnóstico del proveedor.

**Sumar Apple o GitHub mañana** = render `<OAuthButton provider="apple" …/>` +
habilitar el provider en Supabase. El branding/logos ya están listos.
Los logs usan contexto dinámico (`login:{provider}-oauth`).

## Tarea 4 — Cierre de sesión global

- `signOutEverywhere()` (`lib/actions/auth.ts`): `supabase.auth.signOut({ scope:
  "global" })` — revoca **todos** los refresh tokens del usuario (las demás
  sesiones caen al expirar su access token, ≤1 h). En éxito redirige a
  `/ingresar?notice=Cerraste sesión en todos los dispositivos.`; en fallo devuelve
  error (log + toast).
- `GlobalSignOutButton` **(nuevo)**: fila "Sesiones activas" con confirmación de
  dos clics, montada en los "Métodos de acceso" de `/perfil` y `/pro/perfil`.
- `/ingresar` ahora renderiza el query `notice` como banner de éxito (verde),
  además del `error` existente.

## Tareas manuales

- Ninguna obligatoria. Opcional: setear `ORPHAN_PURGE_ENABLED="true"` en Vercel
  cuando quieras que el cron pase de listar a purgar de verdad.

## Checklist de humo

1. `/ingresar`: la card entra con fade+slide; alternar método anima el form; el
   botón de Google muestra "Conectando con Google…" al click.
2. Navegar a `/perfil` y `/pro/perfil` con red lenta: skeletons sin saltos.
3. `GET /api/cron/cleanup-orphans` con el Bearer del CRON_SECRET → JSON con
   candidatos en dry-run; con `?purge=1`, purga y lista los IDs.
4. "Cerrar en todos" en `/perfil` → segundo clic → aterriza en `/ingresar` con el
   banner verde; el refresh token de otro dispositivo queda revocado.
