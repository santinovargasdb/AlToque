# Informe — Google Auth fase 2: onboarding, vinculación, tests y monitoreo (2026-07-15)

Continúa `informe-2026-07-15-google-auth.md`.
Verificación: `pnpm typecheck` ✅ · `pnpm lint` ✅ · `pnpm test` ✅ (59 tests) · `pnpm build` ✅.

## Tarea 1 — Flujo de completar perfil (onboarding)

**Cómo funciona:** un registro vía Google/OTP puede llegar sin teléfono (y a veces sin
nombre). El gate `requireCompleteProfile()` (`src/lib/auth.ts`) corre en los layouts de
zona — `src/app/(app)/layout.tsx` y `src/app/(pro)/layout.tsx` — y redirige a
`/completar-perfil` mientras falten `full_name` o `phone`. Como todo acceso al dashboard
pasa por esos layouts (primera carga, hard nav, o montaje del grupo al navegar desde
otra zona), el dashboard queda bloqueado hasta completar. Los admins están exentos.

| Archivo | Cambio |
|---|---|
| `src/lib/auth.ts` | `getSession` ahora trae `phone`; nuevos `homeForRole`, `isProfileComplete`, `requireCompleteProfile` (documentados). |
| `src/lib/validations/auth.ts` | `phoneSchema` (obligatorio, 6–25, dígitos/+/-/() ) y `completeProfileSchema`; `signUpSchema.phone` pasa de opcional a obligatorio. |
| `src/lib/actions/auth.ts` | Server Action `completeProfile` (Zod + update de `profiles` + `revalidatePath`; devuelve `home` por rol). |
| `src/app/(auth)/completar-perfil/page.tsx` **(nuevo)** | Aterrizaje del onboarding; si el perfil ya está completo redirige al home del rol; precarga el nombre de Google. |
| `src/components/auth/complete-profile-form.tsx` **(nuevo)** | Form nombre+teléfono con doble modo: `onboarding` (hard nav al home) y `edit` (refresh in situ, reutilizado en `/perfil`). |
| `src/app/(app)/layout.tsx`, `src/app/(pro)/layout.tsx` | Gate `await requireCompleteProfile()`. |
| `src/components/auth/password-signup-form.tsx` | Teléfono obligatorio (consistente con el schema). |

**Decisión de alcance:** los campos "especialidad/dirección" del profesional ya tienen
su flujo dedicado (checklist de activación de `/pro/inicio` → `/pro/perfil` +
regla #6 "solo `approved` aparece en búsquedas"), así que el onboarding bloqueante
cubre los datos de la tabla `profiles` comunes a ambos roles.

## Tarea 2 — Vincular / desvincular Google en configuración

| Archivo | Cambio |
|---|---|
| `src/components/auth/google-account-link.tsx` **(nuevo)** | Estado de la identidad Google (badge Vinculada/No vinculada) + **Vincular** (`linkIdentity` → OAuth → `/auth/callback?next={returnTo}`) y **Desvincular** (`unlinkIdentity`) con confirmación de dos clics, loading y toasts. |
| `src/components/auth/set-password-button.tsx` **(nuevo)** | "Configurar contraseña" reutilizando el flujo de recovery (email → `/restablecer`). |
| `src/app/(app)/perfil/page.tsx` | Página real de configuración del cliente (reemplaza ComingSoon): datos de contacto editables + métodos de acceso + salir. |
| `src/app/(pro)/pro/perfil/page.tsx` | Sección "Métodos de acceso" agregada al final. |

**Guarda anti-lockout:** desvincular Google solo se habilita si existe una identidad
`email` y hay más de una identidad. Nota: Supabase no expone "tiene contraseña" al
cliente; la identidad `email` garantiza acceso por contraseña *o* código OTP (ambos
operativos en la app), y `SetPasswordButton` da el camino para fijar contraseña antes
de desvincular. El botón deshabilitado muestra el motivo en el subtítulo.

## Tarea 3 — Tests de integración y edge cases

`tests/auth-validation.test.ts` (pragma `@vitest-environment node`) ahora ejercita el
**handler real** `GET /auth/callback` con `@/lib/supabase/server` y `@/lib/db`
mockeados (spies hoisted):

1. **Email existente con contraseña + Google (vinculación automática):** usuario con
   `created_at` viejo y `?role=provider` → redirige y NO toca rol/DB ni refresca sesión.
2. **Fallo del intercambio y timeout duro** (mock que rechaza con `ETIMEDOUT`):
   redirección limpia a `/ingresar?error=…`, sin 500 y sin escrituras.
3. **Cancelación manual** (`?error=access_denied`): mensaje "Cancelaste el ingreso con
   Google…" sin tocar la sesión.
4. Extra: promoción del signup nuevo (update+insert+refresh llamados exactamente 1 vez)
   y signup sin `role` (no consulta ni escribe).
5. `completeProfileSchema` (acepta/rechaza) — total 38 tests en el archivo, 59 en la suite.

## Tarea 4 — Captura y monitoreo de errores de auth

`src/lib/auth-log.ts` **(nuevo)**: `logAuthError(context, error, meta)` — formato
estructurado `[auth] {context} {json}` filtrable en los logs de Vercel y en la consola
del browser. Seguridad: redacta cualquier clave de metadata que matchee
`token|code|secret|password|key|hash|authorization`, serializa solo
`name/message/status/code` del error y trunca mensajes a 300 chars. Integrado en:

- `/auth/callback`: error del proveedor, fallo de exchange, fallo de verifyOtp, fallo
  del refresh post-promoción y un **try/catch integral nuevo** para timeouts de red
  (antes un throw terminaba en 500; ahora redirige limpio y loggea `callback:unexpected`).
- Vistas: `google-button` (`login:google-oauth`), `password-login-form`
  (`login:password`, `login:reset-request`), `password-signup-form`
  (`registro:password`), `otp-form` (`otp:send-code`, `otp:verify-code`),
  `reset-password-form` (`recovery:update-password`), `complete-profile-form`
  (`onboarding:submit`), `google-account-link` (`perfil:link-google`,
  `perfil:unlink-google`, `perfil:load-identities`), `set-password-button`
  (`perfil:set-password`).

## Tareas manuales

1. **Supabase → Authentication → Settings**: habilitar **Manual linking** (necesario
   para `linkIdentity`/`unlinkIdentity` de la Tarea 2).
2. Sin variables de entorno nuevas ni cambios de SQL.

## Checklist de humo

1. Registro con Google (cliente) → aterriza en `/completar-perfil` → completa teléfono →
   entra a `/inicio`; tipear `/buscar` a mano antes de completar redirige de vuelta.
2. `/perfil` → Vincular Google (cuenta con contraseña) → vuelve vinculada; Desvincular
   pide segundo clic y funciona; con Google como único método, el botón queda
   deshabilitado con la explicación y "Configurar contraseña" envía el email.
3. Logs: forzar un error (cancelar consentimiento) y verificar la línea `[auth]
   callback:provider-error {...}` sin datos sensibles.
