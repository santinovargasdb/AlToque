# Informe de arquitectura — Audit Trail, Notificaciones In-App y Emails (2026-07-16)

Verificación: `pnpm typecheck` ✅ · `pnpm lint` ✅ · `pnpm test` ✅ (80 tests) · `pnpm build` ✅.

## 1. Audit Trail (historial de seguridad inmutable)

**Tabla `audit_logs`** (Drizzle → migración `drizzle/migrations/0001_bouncy_martin_li.sql`):
`id` UUID · `user_id` UUID *nullable y sin FK a propósito* (los eventos pre-login no tienen
usuario y el historial sobrevive a la purga de cuentas) · `action` · `ip_address` ·
`user_agent` · `metadata` JSONB · `created_at`, con índice `(user_id, created_at)`.

**Helper `logSecurityEvent(action, {userId, metadata})`** (`src/lib/audit.ts`):
- **No bloqueante**: se invoca con `void` (fire-and-forget) y **jamás lanza** — un fallo
  del audit nunca rompe la operación del usuario.
- **Sin datos sensibles**: redacta claves `token|code|secret|password|…` de la metadata y
  los emails se guardan enmascarados (`maskEmail`: `j***@dominio.com`).
- IP/UA salen de `getRequestContext()` (primer hop de `x-forwarded-for` detrás de Vercel).
- `isNewLoginContext(userId)`: compara IP + navegador/OS contra los últimos 20 logins;
  devuelve `false` en el primer login (no alarmar cuentas recién creadas). Se evalúa
  **antes** de insertar el login actual (si no, siempre matchearía consigo mismo).

**Cobertura** (todas fire-and-forget):

| Evento | Dónde |
|---|---|
| `login` (password/oauth/otp) | `signInWithPassword`, callback PKCE (`auditPkceSuccess`), callback verifyOtp |
| `failed_login` | password inválido, error del proveedor OAuth, exchange fallido, OTP inválido |
| `signup` | `signUpWithPassword` |
| `logout` / `logout_all` | `signOut` / `signOutEverywhere` |
| `password_change` / `password_reset_request` | `updatePassword` / `requestPasswordReset` |
| `identity_link` | callback con el nuevo param `flow=link` (lo setea `GoogleAccountLink`) |
| `identity_unlink` | `recordUnlinkAudit` (`lib/actions/audit.ts`; el unlink corre en el browser) |
| `profile_update` | `completeProfile` (con flag `onboarding`) |

**UI**: `SecurityActivity` (`components/shared/security-activity.tsx`, Server Component)
en `/perfil` y `/pro/perfil`: últimos 5 eventos con etiqueta, navegador/OS aproximados
(`parseUserAgent`, sin dependencias), IP y fecha.

**RLS** (`docs/audit-notifications-setup.sql`): `audit_logs` con RLS habilitado y una única
policy de SELECT propio — sin policies de escritura, el cliente no puede insertar ni
alterar su historial (inmutable desde el browser; el server escribe con el rol owner).

## 2. Notificaciones In-App (campanita)

**Decisión de schema**: la tabla `notifications` YA existía (dispatch urgente, chat,
aceptación de pedido) con RLS `notif_self_rw`. En vez de duplicarla: se agregó la columna
**`link`** (migración 0001) y se aprovecha **`read_at`** como `is_read` (null = no leída,
y además dice cuándo se leyó). Los 3 puntos que insertan notificaciones ahora pueblan
`link` (`/pedido/{id}`, `/pro/pedido/{id}` o `/pro/inicio`).

**`NotificationsBell`** (`components/shared/notifications-bell.tsx`), montada en un
**header sticky nuevo** de los layouts `(app)` y `(pro)` (branding + campanita):
- Badge rojo con contador (9+) si hay no leídas; conteo inicial al montar.
- **Realtime**: suscripción a INSERT de `notifications` filtrada por `user_id` (la
  entrega respeta RLS) → el badge/lista se actualizan en vivo.
- Dropdown animado (tw-animate-css) con **skeletons** espejando la fila real, estados
  vacío/no-leída (resaltado + punto), íconos por tipo, "Marcar todas como leídas" y
  marcado individual (updates optimistas + supabase-js), y navegación al `link`.
- Cierre por click afuera (overlay), accesible (`aria-expanded`, `aria-label` con conteo).

## 3. Sistema de emails (`src/lib/emails/`)

- **`send.ts`**: Resend (ya estaba en dependencias). **No-op sin `RESEND_API_KEY`**
  (mismo patrón que Web Push); remitente por `EMAIL_FROM` (agregado a `.env.example`).
  Nunca lanza.
- **`layout.ts`**: esqueleto compartido — tablas + estilos inline (lo único consistente
  en Gmail/Outlook), una columna máx 480px, design tokens de la marca, preheader.
- **Templates**:
  1. `welcome.ts` — al **completar el onboarding** (primera vez que `completeProfile`
     pasa de incompleto a completo; no en ediciones posteriores). CTA según rol.
  2. `security-alert.ts` — disparado por `security-events.ts#sendSecurityAlert` cuando:
     login desde IP/dispositivo **nuevos**, cambio de contraseña, vinculación o
     desvinculación de Google. Incluye fecha (AR), dispositivo, IP y CTA a /perfil.
  3. `otp.ts` — los OTP los envía **Supabase**, no la app: pegar
     `docs/supabase-otp-email-template.html` (misma salida del template con
     `{{ .Token }}`) en Authentication → Email Templates.
- Tests: `tests/security-emails.test.ts` (parser UA, maskEmail, contenido de los 3
  templates, mobile-friendly).

## Tareas manuales (una vez)

1. **DB**: `pnpm db:migrate` (aplica `0001_bouncy_martin_li.sql`: tabla `audit_logs` +
   columna `notifications.link`) **o** correr la sección 1 de
   `docs/audit-notifications-setup.sql`.
2. **Supabase → SQL Editor**: correr `docs/audit-notifications-setup.sql` (RLS de
   `audit_logs` + publicar `notifications` en Realtime para la campanita en vivo).
3. **Supabase → Authentication → Email Templates**: pegar
   `docs/supabase-otp-email-template.html` en el template de OTP/Magic Link.
4. **Vercel**: `RESEND_API_KEY` + `EMAIL_FROM` (dominio verificado en Resend) para que
   bienvenida y alertas salgan de verdad (sin la key, son no-op logueado).

## Checklist de humo

1. Login con contraseña → fila `login` en `audit_logs`; aparece en "Actividad de
   seguridad" con navegador/OS/IP; segundo login desde otra red/browser → email de alerta.
2. Contraseña incorrecta → `failed_login` con email enmascarado (verificar que NO esté
   el email completo en `metadata`).
3. Aceptar un pedido / mandar un mensaje → la campanita del receptor suma el badge en
   vivo, el dropdown muestra la notificación y el click navega al pedido.
4. "Marcar todas como leídas" → badge a 0 y filas con `read_at` seteado.
5. Completar onboarding de una cuenta Google nueva → email de bienvenida.
6. Vincular/desvincular Google → eventos `identity_link`/`identity_unlink` + alertas.
