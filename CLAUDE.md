# AlToque

Marketplace web/PWA que conecta usuarios con profesionales de oficios verificados (plomería, cerrajería, carpintería, etc.) para urgencias y trabajos agendados. Matching por geolocalización, pago híbrido (efectivo = conectar; transfer/tarjeta = Mercado Pago con split), comisión por trabajo.

## Commands

- `pnpm dev` — Servidor de desarrollo
- `pnpm build` — Build de producción
- `pnpm lint` — Linter
- `pnpm typecheck` — Chequeo de tipos (tsc --noEmit)
- `pnpm test` — Tests (Vitest)
- `pnpm test:e2e` — E2E (Playwright)
- `pnpm db:generate` — Generar migración desde el schema (drizzle-kit generate)
- `pnpm db:migrate` — Aplicar migraciones (drizzle-kit migrate)

> Tras migrar, correr `drizzle/postgis.sql` en Supabase (extensión PostGIS, índices GIST, función `find_nearby_providers`, RLS).

## Tech Stack

Next.js 15 (App Router) + TypeScript (strict) + Tailwind v4 + shadcn/ui + Supabase (Postgres+PostGIS, Auth, Realtime, Storage) + Drizzle + Mercado Pago + Google Maps + Web Push + Vercel.

## Architecture

### Directory Structure

- `src/app/(marketing|auth|app|pro|admin)/` — Rutas agrupadas por rol; `(app)` cliente, `(pro)` profesional, `(admin)` admin.
- `src/app/api/` — Webhooks (Mercado Pago), OAuth MP, push, cron. El resto de mutaciones son Server Actions.
- `src/components/` — `ui` (shadcn), y por dominio: `marketing`, `app`, `pro`, `admin`, `shared`.
- `src/lib/` — `supabase`, `db` (Drizzle + queries + RPC geo), `mercadopago`, `maps`, `push`, `notifications`, `validations`.

### Data Flow

- **Lectura:** Server Components consultan Drizzle/Supabase directo.
- **Mutación:** Server Actions (validadas con Zod) → DB → `revalidatePath`.
- **Tiempo real:** Supabase Realtime (`postgres_changes`) para feed de pedidos del profesional, timeline del cliente y chat. TanStack Query del lado del profesional combina fetch + eventos realtime.
- **Pago:** `cash` no toca MP (registra comisión adeudada); `transfer`/`card` → preferencia MP con `marketplace_fee` → webhook confirma.
- **Geo:** función Postgres `find_nearby_providers` (PostGIS) vía RPC.

### Key Patterns

- Server Components por defecto; `"use client"` solo con interactividad.
- Toda mutación es una Server Action con validación Zod. Nada de lógica de negocio en componentes.
- Autorización en dos capas: middleware por rol + RLS en Postgres. El `role` viaja como claim JWT.
- `acceptJob` es race-safe vía `UPDATE ... WHERE status='broadcasting'` (el primero que acepta gana).
- La comisión se calcula SOLO en `lib/mercadopago/commission.ts`.
- `provider_mp_tokens` jamás se expone al cliente (solo service_role).

## Code Organization Rules

1. Un componente por archivo. Máx 300 líneas; si se pasa, extraer subcomponentes.
2. Alias `@/` para `src/`.
3. Sin barrel exports; importar del archivo fuente.
4. Server Components por defecto.
5. Colocar componentes específicos de una página junto a la página.

## Design System

### Colors

Primary `#2563EB` · Accent `#F97316` · Background `#F8FAFC` · Surface `#FFFFFF` · Text `#0F172A` · Muted `#64748B` · Border `#E2E8F0` · Success/Verified `#16A34A` · Warning `#F59E0B` · Destructive `#DC2626`.

### Typography

- Headings: Plus Jakarta Sans, 600–700.
- Body: Inter, 16px base.

### Style

- Border radius 10px (16px cards, full avatars). Sombras suaves. Base de espaciado 4px.
- Estética: limpia, cálida, confiable, mobile-first. Verificación y reviews siempre visibles.

## Environment Variables

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Postgres (pooler de Supabase) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase |
| `MP_CLIENT_ID` / `MP_CLIENT_SECRET` / `MP_ACCESS_TOKEN` / `NEXT_PUBLIC_MP_PUBLIC_KEY` / `MP_WEBHOOK_SECRET` | Mercado Pago |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` / `GOOGLE_MAPS_SERVER_KEY` | Google Maps |
| `RESEND_API_KEY` | Email |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push |
| `CRON_SECRET` / `COMMISSION_RATE` / `NEXT_PUBLIC_APP_URL` | Cron, comisión, URL |

## Reglas No Negociables

1. TypeScript strict. Prohibido `any`; usar tipos inferidos de Drizzle/Zod.
2. Verificar la firma de TODOS los webhooks de Mercado Pago + idempotencia por `mp_payment_id`.
3. RLS habilitado en todas las tablas. `provider_mp_tokens` solo service_role.
4. La comisión se calcula en un solo lugar (`lib/mercadopago/commission.ts`); nunca duplicar la fórmula.
5. Nunca commitear `.env*`. Validar env vars con Zod al iniciar.
6. Solo profesionales `approved` aparecen en búsquedas/dispatch.
7. Mobile-first: cada vista funciona en 360px de ancho.

## Estado del scaffold

**Steps 1–8 + 9a + 9b + 10 + 11 + 12 completos** (typecheck/lint/test/build OK).

- **Step 1 (scaffolding + diseño):** config + tooling, design tokens, layout/providers, PWA (manifest + service worker), landing + páginas de marketing, UI base (`Button`, `Input`, `Label`, `VerifiedBadge`).
- **Step 2 (base de datos):** schema Drizzle completo, customType `geography`, cliente DB, `queries.ts` (RPC geo), `postgis.sql` (índices GIST + `find_nearby_providers` + RLS + Realtime), seed de categorías.
- **Step 3 (auth + roles):** login/registro reales con Supabase Auth (email + OTP de 6 dígitos), selección de rol en el registro (metadata → trigger crea `profiles`), `/auth/callback` (magic link / PKCE), claim `user_role` en el JWT (`auth-triggers.sql`), middleware de protección por rol, `signOut` (server action). Requiere activar el Custom Access Token Hook y el template de OTP en Supabase (ver README).
- **Step 4 (onboarding + verificación):** `/pro/perfil` (oficios + zona con Google Places/geolocalización + radio + bio → `updateProviderProfile`), `/pro/verificacion` (subida de DNI+selfie a bucket privado → `uploadVerification`), `/admin/verificaciones` (cola con URLs firmadas + aprobar/rechazar), checklist de activación en `/pro/inicio`. Buckets/políticas en `drizzle/storage.sql`. Acceso server-side vía Drizzle (`db`) bypassa RLS por diseño → la autorización se enforce en cada server action con `getSession`/`requireRole`.
- **Step 5 (búsqueda geo + perfiles):** `/inicio` con buscador (`ClientSearch`: oficio + dirección), `/buscar` con `searchProviders` (RPC `find_nearby_providers` + enriquecimiento) → lista (`ProviderCard`) + `MapView`, perfil público `/profesional/[id]` (VerifiedBadge, `RatingStars`, oficios, reviews). Componentes compartidos: `RatingStars`, `MapView` (fallback sin API key). Solo se listan profesionales `approved`.
- **Step 6 (ciclo del pedido, flujo agendado):** wizard `/pedido/nuevo?providerId=` (oficio → detalle + fotos a bucket `job-photos` → ubicación → tipo + pago) → `createJob` (snapshot de `commission_rate`). Detalle cliente `/pedido/[id]` y profesional `/pro/pedido/[id]` con `JobStatusTimeline`. Transiciones: `updateJobStatus` (aceptar/iniciar/cancelar) y `completeJob` (precio final → comisión vía `commission.ts`). Listas `/pedidos` (cliente) y `/pro/pedidos` (profesional). Pago real y `commission_ledger` = Step 9.
- **Step 7 (despacho urgente en tiempo real):** RPC `find_nearby_online_providers` (variante que exige `is_online`). `createJob` urgente sin proveedor → broadcast: inserta `jobs` (`status='broadcasting'`) + filas en `job_dispatch` (`notified`) + `dispatchNewUrgentJob` (notifica in-app; Web Push = Step 8). `acceptJob` race-safe (`UPDATE ... WHERE status='broadcasting'` → el primero gana; resto de dispatch → `expired`), `declineJob`, `toggleOnline`, `getIncomingJobs` en `lib/actions/dispatch.ts`. `/pro/inicio`: `ProDispatchPanel` (toggle online optimista + `IncomingJobsFeed` por Supabase Realtime sobre `job_dispatch` + TanStack Query con refetch de respaldo) → `IncomingJobCard` (cuenta regresiva 10 min). Vercel Cron `/api/cron/expire-jobs` (cada 5 min, protegido por `CRON_SECRET`; `vercel.json`). Realtime publica `jobs`/`job_dispatch`/`messages`. Tests de integración en `tests/integration/dispatch.test.ts` (race-safety de `acceptJob`, `declineJob`, poblado de `job_dispatch` por `createJob`) — gateados por `TEST_DATABASE_URL`; corren contra una DB Postgres plana de test (sin PostGIS; helper `tests/helpers/test-db.ts`). Correr con `TEST_DATABASE_URL=postgresql://... pnpm test`; sin esa env se saltan y `pnpm test` queda verde.
- **Step 8 (Web Push, PWA):** el service worker (`src/app/sw.ts`) ya traía los handlers `push`/`notificationclick`. Agregado: `lib/push/send.ts` (`sendPushToUsers` con `web-push`/VAPID — no-op sin claves, limpia suscripciones muertas 404/410), ruta `POST|DELETE /api/push/subscribe` (upsert/borra por `endpoint`, autenticada con Supabase server client), `lib/validations/push.ts` (Zod), helper isomórfico `lib/push/vapid.ts` (`urlBase64ToUint8Array`), componente `components/shared/push-subscribe.tsx` (toggle "Activar notificaciones"; no se muestra sin soporte o sin `NEXT_PUBLIC_VAPID_PUBLIC_KEY`). Integrado en `dispatchNewUrgentJob` (push al profesional por nuevo pedido urgente) y en `acceptJob` (notificación in-app + push al cliente cuando aceptan su pedido). Montado en `/pro/inicio` y `/pedido/[id]`. Requiere env `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` (server) y `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (cliente); opcional `VAPID_SUBJECT` (default `mailto:soporte@altoque.app`). Tests: `tests/push.test.ts` (`urlBase64ToUint8Array`, schema Zod, `sendPushToUsers` con `web-push`/DB mockeados). Falta (polish): generar los PNG de íconos `public/icons/icon-192.png` + `badge-72.png` (hoy el push usa el ícono por defecto del browser).

- **Step 9a (pagos MP — entrada de dinero, escrow reintegrable):** modelo escrow elegido en brainstorming (cliente prepaga el estimado a la cuenta MP de AlToque → `held`, reintegrable hasta completar/cancelar). `lib/mercadopago/`: `client.ts` (`mpConfig`, lanza sin `MP_ACCESS_TOKEN`), `preference.ts` (`buildJobPreferenceBody` + `createJobPreference` → Checkout Pro), `webhook.ts` (`isValidWebhookSignature` con el `WebhookSignatureValidator` oficial del SDK + `fetchPaymentInfo`), `refund.ts` (`refundJobPayment` total), `payments.ts` (`markPaymentHeld` idempotente por `isNull(mp_payment_id)`). `createJob` (transfer/card) crea preferencia, deja `paymentStatus='pending'` y devuelve `redirectUrl` (urgente: broadcast inmediato, pago en paralelo). Webhook `POST /api/webhooks/mercadopago` (firma → 401; idempotencia; `data.id` de query con fallback al body) → `held`. `updateJobStatus`: gate de `in_progress` sin pago + reintegro al cancelar si `held`. Cron `expire-jobs` también expira urgentes aceptados sin pagar y reintegra `held` expirados. Índice único parcial `uq_jobs_mp_payment_id` (en `postgis.sql`). UI: `JobPaymentPanel` (cliente), input de estimado + redirección en el wizard, banner "Esperando pago" + gate de Iniciar (pro). Tests: `tests/payments.test.ts` (schema, builder, firma con validador mockeado) + `tests/integration/payments.test.ts` (gateado por `TEST_DATABASE_URL`). Spec/plan en `docs/superpowers/`. **Pendiente activar:** `MP_ACCESS_TOKEN`/`MP_WEBHOOK_SECRET`/`NEXT_PUBLIC_APP_URL` en env, webhook + clave secreta en MP, re-correr `postgis.sql` en Supabase.

- **Google OAuth (2026-07-15):** botón "Continuar con Google" (`components/auth/google-button.tsx`, diseño oficial + loading/disabled/toasts; `AuthDivider`) en `/ingresar` y `/registro` vía `signInWithOAuth` → mismo `/auth/callback` PKCE. Params del callback validados con Zod (`authCallbackParamsSchema`: `next` interno con `.catch("/inicio")`, `role` client|provider con `.catch(null)`); errores del proveedor (`?error=access_denied`) → mensaje amigable en `/ingresar`. Registro como profesional vía Google: el trigger no recibe `role` en metadata, así que el callback promueve el signup (`promoteOAuthSignupToProvider`: solo usuarios creados hace <10 min y con rol `client` → `profiles.role='provider'` + `provider_profiles` + `refreshSession()` para re-emitir el claim `user_role`); una cuenta existente NUNCA cambia de rol por loguearse. Credenciales de Google: SOLO en Supabase → Providers → Google (la app no las lee; ver `.env.example`). Supabase linkea identidades automáticamente por email verificado.
- **Avatar upload (2026-07-15):** `AvatarUploader` (`components/shared/avatar-uploader.tsx`) en `/perfil` y `/pro/perfil` — validación instantánea (solo raster image/*, sin SVG por XSS, máx 2 MB = `AVATAR_MAX_BYTES` en `lib/validations/profile.ts`), preview inmediato con ObjectURL (con revoke), spinner superpuesto + selector deshabilitado durante la subida, toasts de éxito/error (incluye mensaje específico si falta el bucket/políticas). Sube a `avatars/{uid}/avatar-{timestamp}.{ext}` (único → sin colisiones ni caché) y persiste vía Server Action `updateAvatar` (`lib/actions/profile.ts`): re-valida path con Zod + carpeta propia, actualiza `profiles.avatar_url` con Drizzle, borra el avatar anterior (service_role, best-effort) y revalida rutas. `BUCKETS` extraído a `lib/storage-buckets.ts` (isomórfico; `lib/storage.ts` sigue server-only). Skeletons de ambas páginas actualizados. **Setup requerido en Supabase:** correr `docs/supabase-storage-setup.sql` (bucket `avatars` con `file_size_limit` 2 MB + `allowed_mime_types` + RLS: lectura pública, escritura solo el dueño en su carpeta) — sin esto la subida falla. Tests: `tests/profile-validation.test.ts`.
- **Auth premium — UX, mantenimiento y multiproveedor (2026-07-15):** (1) **Microinteracciones**: entrada animada de la card de `(auth)` y transición al alternar método (clases `animate-in` de tw-animate-css, ya importado en globals.css); botón OAuth con `active:scale`, sombra en hover y texto "Conectando con {proveedor}…". **Skeletons** (`components/ui/skeleton.tsx` + `loading.tsx` de `/completar-perfil`, `/perfil` y `/pro/perfil`, y en la carga de identidades de `GoogleAccountLink`) espejando la geometría real → CLS ≈ 0 mientras se valida la sesión. (2) **Mantenimiento**: `lib/db/maintenance.ts` — `findOrphanProfiles` (Drizzle: sin nombre/teléfono tras 48 h, sin jobs, no-admin) y `purgeOrphanProfiles` (verifica identidad OAuth vía Admin API con service_role; borra auth.users → profiles; `dryRun` default). Cron `GET /api/cron/cleanup-orphans` (CRON_SECRET; diario en vercel.json; solo lista salvo `ORPHAN_PURGE_ENABLED="true"` o `?purge=1`). (3) **Multiproveedor**: `OAuthButton` genérico (`components/auth/oauth-button.tsx`) con registry de branding (google/apple/github — logos y colores oficiales) y `signInWithOAuth` dinámico; reemplaza a `google-button.tsx` (eliminado); habilitar un proveedor nuevo = registry + Supabase Providers. (4) **Logout global**: `signOutEverywhere` (`signOut({ scope: "global" })` revoca todos los refresh tokens) + `GlobalSignOutButton` (confirmación de dos clics) en los "Métodos de acceso" de `/perfil` y `/pro/perfil` → redirige a `/ingresar?notice=…` (banner de confirmación nuevo).
- **Google Auth fase 2 — onboarding, vinculación y monitoreo (2026-07-15):** (1) **Onboarding**: gate `requireCompleteProfile()` (`lib/auth.ts`) en los layouts `(app)` y `(pro)` — sin `full_name`+`phone` (Google/OTP pueden no traerlos) redirige a `/completar-perfil` (`CompleteProfileForm` + acción `completeProfile`, schema `completeProfileSchema`); admins exentos; teléfono ahora OBLIGATORIO también en el registro con contraseña (`phoneSchema`). (2) **Vinculación**: `GoogleAccountLink` (`linkIdentity`/`unlinkIdentity`; desvincular exige identidad `email` + >1 identidad — anti-lockout — con confirmación de dos clics) y `SetPasswordButton` (configura contraseña vía flujo recovery), montados en `/perfil` (página real de configuración, reemplaza ComingSoon; edita datos con `CompleteProfileForm mode="edit"`) y `/pro/perfil`. Requiere **Manual linking** habilitado en Supabase → Authentication → Settings. (3) **Tests**: `tests/auth-validation.test.ts` ahora también testea el handler real de `/auth/callback` con Supabase/Drizzle mockeados (cancelación, código inválido, timeout con try/catch, vinculación de cuenta existente sin cambio de rol, promoción de signup nuevo) — pragma `@vitest-environment node`. (4) **Monitoreo**: `lib/auth-log.ts` (`logAuthError(context, error, meta)` — redacta claves sensibles token/code/password/etc., serializa solo name/message/status/code, prefijo `[auth]` filtrable en logs de Vercel) integrado en el callback (incl. try/catch anti-timeout) y en todos los forms de auth.
- **Auth hardening (2026-07-15):** registro/login con **email + contraseña** además del OTP (alternables en `/registro` e `/ingresar`). `lib/validations/auth.ts`: `emailSchema` estricto (regex + TLD, compartido como `EMAIL_INPUT_PATTERN` para el atributo `pattern` de los inputs) y `PASSWORD_RULES`/`passwordSchema` (mín 8, letra, número, especial; máx 72) — única fuente de verdad para el checklist en vivo (`PasswordFields`) y la validación server-side. Server actions en `lib/actions/auth.ts`: `signUpWithPassword` (metadata → trigger de profiles, detecta email ya registrado), `signInWithPassword`, `requestPasswordReset` + `updatePassword` (flujo recovery → `/restablecer`). **Fix del callback:** `/auth/callback` resuelve la base URL con `x-forwarded-host`/`x-forwarded-proto` en prod (fallback `NEXT_PUBLIC_APP_URL`) — nunca redirige a localhost detrás del proxy de Vercel; `next` validado contra open redirect (`//`). Helper `lib/url.ts` (`getRequestOrigin`) para `emailRedirectTo` dinámico. Tests: `tests/auth-validation.test.ts`. Requiere en Supabase: provider Email con contraseña habilitado + Site URL/Redirect URLs de producción.
- **Step 9b (liquidación al completar):** `completeJob` liquida en transacción: comisión SIEMPRE vía `commission.ts`; cash → `paymentStatus='paid_cash'` + ledger `cash_debt/owed`; prepago `held` → reintegro **parcial** (`refundJobPaymentPartial` en `refund.ts`) si el final < estimado, luego `released` + ledger `split/collected`; si el final > estimado, el excedente se abona directo al profesional (decisión: sin segundo cobro por MP en esta etapa; la comisión igual se calcula sobre el final completo — nota visible en `JobDetailView`). Además incrementa `provider_profiles.jobs_completed`. `/pro/cobros`: totales (facturado, neto, deuda por efectivo) + detalle del ledger. `/admin/comisiones`: totales cobrado/adeudado/saldado + tabla + `settleCommission` (owed → settled, `SettleCommissionButton`). El payout del neto al profesional sigue siendo batch/manual (decisión #3 del spec 9a).
- **Step 10 (reviews):** `submitReview` en `lib/actions/review.ts` (solo trabajos `completed`, solo las partes, target forzado a la contraparte, única por job+autor, recalcula `rating_avg` del profesional en transacción). UI: `ReviewForm` (estrellas + comentario) y `ReviewSummary` en `/pedido/[id]` y `/pro/pedido/[id]`. El perfil público ya mostraba reseñas (Step 5).
- **Step 11 (chat por trabajo):** `sendMessage` en `lib/actions/message.ts` (Zod en `lib/validations/message.ts`; solo las partes, estados accepted/in_progress/completed; notifica in-app + push con tag `chat-{jobId}`). `JobChat` (`components/shared/job-chat.tsx`): SSR de mensajes iniciales (`getJobMessages`) + Supabase Realtime (INSERT en `messages`, RLS limita a las partes) + append optimista dedupeado por id; solo lectura al completar. Montado en ambos detalles de pedido. `/mensajes`: lista de conversaciones del cliente con último mensaje (`selectDistinctOn`).
- **Step 12 (admin):** dashboard `/admin` con KPIs reales (verificados, completados, GMV, comisión cobrada), `/admin/trabajos` (tabla global con alias de Drizzle para cliente/profesional), `/admin/profesionales` (verificación/rating/online), `/admin/comisiones` (ver 9b). Verificaciones ya existía (Step 4).

Pendiente (seguir el **Build Order**, Sección 9): payout automático al profesional + upcharge por MP (extensión de 9b; hoy manual) → SEO (Step 13) → polish + deploy (Step 14: perfil cliente editable, `/pro/mensajes`, íconos push).

### Nota importante sobre RLS
Las queries server-side usan Drizzle conectado por `DATABASE_URL` (rol owner del pooler) que **bypassa RLS**. RLS protege el camino del cliente (supabase-js en el browser) y es defensa en profundidad. Por eso toda Server Action server-side debe validar el rol explícitamente (`getSession`/`requireRole`) antes de mutar.
