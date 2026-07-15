# Informe de cambios — Google Auth + UX de login/registro (2026-07-15)

Continúa el informe de `informe-2026-07-15-auth-y-roadmap.md`.
Verificación: `pnpm typecheck` ✅ · `pnpm lint` ✅ · `pnpm test` ✅ (49 tests) · `pnpm build` ✅.

## Arquitectura del flujo

```
[GoogleButton] ── signInWithOAuth(provider: "google",
                    redirectTo: {origin}/auth/callback?next=…&role=…)
      │
      ▼
   Google (consentimiento) ──► Supabase (/auth/v1/callback, intercambia con Google)
      │
      ▼
   /auth/callback?code=…&next=…&role=…          ← nuestra ruta (PKCE)
      ├─ ?error= → /ingresar con mensaje amigable
      ├─ Zod: next (solo rutas internas), role (client|provider)
      ├─ exchangeCodeForSession(code)
      ├─ role=provider + signup nuevo → promoción a profesional + refreshSession()
      └─ redirect a {base-pública}{next}   ← x-forwarded-host, nunca localhost
```

**Dónde viven las credenciales:** el Client ID/Secret de Google se cargan en
**Supabase → Authentication → Providers → Google**. La app nunca los lee ni
los expone; no agregar a Vercel (documentado en `.env.example`).

## Historial de cambios

| Archivo | Cambio | Por qué |
|---|---|---|
| `src/components/auth/google-button.tsx` **(nuevo)** | Botón con el diseño oficial de Google (logo "G" SVG multicolor, fondo blanco, borde sutil). Estados: loading con spinner (se mantiene activo durante la navegación a Google para evitar doble click), `disabled`, errores por toast (mensaje específico si el provider no está habilitado). Props tipadas: `redirectTo`, `role?`, `label?`. | UI del OAuth. |
| `src/components/auth/auth-divider.tsx` **(nuevo)** | Separador "o" accesible (`role="separator"`). | Divide Google del form de contraseña/OTP en ambas pantallas. |
| `src/components/auth/login-flow.tsx` | Google primero + divider + contraseña/OTP alternables. JSDoc. | UX: el camino de menor fricción arriba. |
| `src/components/auth/registro-flow.tsx` | Tras elegir rol: "Registrarme con Google" (pasa el rol como intención al callback) + divider + contraseña/OTP. | El rol elegido no puede viajar en los metadatos de Google → viaja como query param seguro. |
| `src/lib/validations/auth.ts` | Nuevo `authCallbackParamsSchema`: `next` solo rutas internas (degrada a `/inicio` con `.catch`, anti open redirect), `role` solo `client\|provider` (degrada a `null` — p.ej. `role=admin` no escala privilegios). | Validación Zod de la entrada del callback (pedido del punto 3). |
| `src/app/auth/callback/route.ts` | 1) Manejo de `?error=`/`error_description` del proveedor → redirect amigable a `/ingresar` (caso típico: usuario cancela el consentimiento). 2) Params validados con Zod. 3) `promoteOAuthSignupToProvider()`: si `role=provider`, usuario creado hace <10 min y perfil aún `client` → transacción (`profiles.role='provider'` + insert `provider_profiles`) + `supabase.auth.refreshSession()` para re-emitir el JWT con el claim `user_role` correcto (si falla, el middleware resuelve por DB). 4) Logs de error con contexto. Todo documentado con JSDoc. | El trigger `handle_new_user` crea perfiles de Google como `client` (Google no manda `role`); sin esta pieza, registrarse como profesional con Google era imposible. La ventana de 10 min garantiza que **una cuenta existente jamás cambia de rol por loguearse**. |
| `.env.example` | Sección Google OAuth: aclara que las credenciales van al dashboard de Supabase (con la redirect URI de Google Cloud), no a la app ni a Vercel. | Configuración segura y sin confusiones. |
| `tests/auth-validation.test.ts` | +4 tests del schema del callback (next externo/absoluto degradado, role desconocido → null). | Regresión de seguridad. |
| `CLAUDE.md` | Estado del scaffold: bloque "Google OAuth (2026-07-15)". | Log técnico del repo. |

## Tareas manuales (una sola vez)

### Google Cloud Console (console.cloud.google.com)
1. Crear/usar un proyecto → **APIs & Services → OAuth consent screen**: tipo *External*, completar nombre "AlToque", dominios autorizados.
2. **Credentials → Create Credentials → OAuth client ID** (tipo *Web application*):
   - **Authorized JavaScript origins**: `https://<tu-dominio>.vercel.app` y `http://localhost:3000`.
   - **Authorized redirect URIs**: `https://<PROJECT-REF>.supabase.co/auth/v1/callback` ← **la de Supabase, no la de la app** (evita los errores de origen/redirect_uri_mismatch).
3. Copiar **Client ID** y **Client Secret**.

### Supabase Dashboard
1. **Authentication → Providers → Google**: habilitar y pegar Client ID + Secret.
2. **Authentication → URL Configuration**: confirmar que `https://<tu-dominio>.vercel.app/auth/callback` y `http://localhost:3000/auth/callback` están en Redirect URLs (ya requerido por el fix anterior; el flujo de Google usa la misma allow-list).
3. Vinculación de cuentas: Supabase **linkea automáticamente** una identidad Google a la cuenta existente con el mismo email verificado (el usuario que se registró con contraseña puede entrar con Google sin duplicar cuenta).

### Vercel
- Sin variables nuevas. (`NEXT_PUBLIC_APP_URL` ya requerida.)

## Checklist de humo
1. `/ingresar` → "Continuar con Google" → consentimiento → vuelve al dominio correcto con sesión de cliente.
2. `/registro` → "Ofrezco mi oficio" → "Registrarme con Google" → aterriza en `/pro/inicio` con perfil profesional (verificación `pending`).
3. Cancelar el consentimiento en Google → vuelve a `/ingresar` con el aviso "Cancelaste el ingreso con Google".
4. Usuario existente (registrado con contraseña) entra con Google con el mismo email → misma cuenta, mismo rol (sin promoción).
