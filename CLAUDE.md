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

**Steps 1–8 + 9a completos** (typecheck/lint/test/build OK).

- **Step 1 (scaffolding + diseño):** config + tooling, design tokens, layout/providers, PWA (manifest + service worker), landing + páginas de marketing, UI base (`Button`, `Input`, `Label`, `VerifiedBadge`).
- **Step 2 (base de datos):** schema Drizzle completo, customType `geography`, cliente DB, `queries.ts` (RPC geo), `postgis.sql` (índices GIST + `find_nearby_providers` + RLS + Realtime), seed de categorías.
- **Step 3 (auth + roles):** login/registro reales con Supabase Auth (email + OTP de 6 dígitos), selección de rol en el registro (metadata → trigger crea `profiles`), `/auth/callback` (magic link / PKCE), claim `user_role` en el JWT (`auth-triggers.sql`), middleware de protección por rol, `signOut` (server action). Requiere activar el Custom Access Token Hook y el template de OTP en Supabase (ver README).
- **Step 4 (onboarding + verificación):** `/pro/perfil` (oficios + zona con Google Places/geolocalización + radio + bio → `updateProviderProfile`), `/pro/verificacion` (subida de DNI+selfie a bucket privado → `uploadVerification`), `/admin/verificaciones` (cola con URLs firmadas + aprobar/rechazar), checklist de activación en `/pro/inicio`. Buckets/políticas en `drizzle/storage.sql`. Acceso server-side vía Drizzle (`db`) bypassa RLS por diseño → la autorización se enforce en cada server action con `getSession`/`requireRole`.
- **Step 5 (búsqueda geo + perfiles):** `/inicio` con buscador (`ClientSearch`: oficio + dirección), `/buscar` con `searchProviders` (RPC `find_nearby_providers` + enriquecimiento) → lista (`ProviderCard`) + `MapView`, perfil público `/profesional/[id]` (VerifiedBadge, `RatingStars`, oficios, reviews). Componentes compartidos: `RatingStars`, `MapView` (fallback sin API key). Solo se listan profesionales `approved`.
- **Step 6 (ciclo del pedido, flujo agendado):** wizard `/pedido/nuevo?providerId=` (oficio → detalle + fotos a bucket `job-photos` → ubicación → tipo + pago) → `createJob` (snapshot de `commission_rate`). Detalle cliente `/pedido/[id]` y profesional `/pro/pedido/[id]` con `JobStatusTimeline`. Transiciones: `updateJobStatus` (aceptar/iniciar/cancelar) y `completeJob` (precio final → comisión vía `commission.ts`). Listas `/pedidos` (cliente) y `/pro/pedidos` (profesional). Pago real y `commission_ledger` = Step 9.
- **Step 7 (despacho urgente en tiempo real):** RPC `find_nearby_online_providers` (variante que exige `is_online`). `createJob` urgente sin proveedor → broadcast: inserta `jobs` (`status='broadcasting'`) + filas en `job_dispatch` (`notified`) + `dispatchNewUrgentJob` (notifica in-app; Web Push = Step 8). `acceptJob` race-safe (`UPDATE ... WHERE status='broadcasting'` → el primero gana; resto de dispatch → `expired`), `declineJob`, `toggleOnline`, `getIncomingJobs` en `lib/actions/dispatch.ts`. `/pro/inicio`: `ProDispatchPanel` (toggle online optimista + `IncomingJobsFeed` por Supabase Realtime sobre `job_dispatch` + TanStack Query con refetch de respaldo) → `IncomingJobCard` (cuenta regresiva 10 min). Vercel Cron `/api/cron/expire-jobs` (cada 5 min, protegido por `CRON_SECRET`; `vercel.json`). Realtime publica `jobs`/`job_dispatch`/`messages`. Tests de integración en `tests/integration/dispatch.test.ts` (race-safety de `acceptJob`, `declineJob`, poblado de `job_dispatch` por `createJob`) — gateados por `TEST_DATABASE_URL`; corren contra una DB Postgres plana de test (sin PostGIS; helper `tests/helpers/test-db.ts`). Correr con `TEST_DATABASE_URL=postgresql://... pnpm test`; sin esa env se saltan y `pnpm test` queda verde.
- **Step 8 (Web Push, PWA):** el service worker (`src/app/sw.ts`) ya traía los handlers `push`/`notificationclick`. Agregado: `lib/push/send.ts` (`sendPushToUsers` con `web-push`/VAPID — no-op sin claves, limpia suscripciones muertas 404/410), ruta `POST|DELETE /api/push/subscribe` (upsert/borra por `endpoint`, autenticada con Supabase server client), `lib/validations/push.ts` (Zod), helper isomórfico `lib/push/vapid.ts` (`urlBase64ToUint8Array`), componente `components/shared/push-subscribe.tsx` (toggle "Activar notificaciones"; no se muestra sin soporte o sin `NEXT_PUBLIC_VAPID_PUBLIC_KEY`). Integrado en `dispatchNewUrgentJob` (push al profesional por nuevo pedido urgente) y en `acceptJob` (notificación in-app + push al cliente cuando aceptan su pedido). Montado en `/pro/inicio` y `/pedido/[id]`. Requiere env `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` (server) y `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (cliente); opcional `VAPID_SUBJECT` (default `mailto:soporte@altoque.app`). Tests: `tests/push.test.ts` (`urlBase64ToUint8Array`, schema Zod, `sendPushToUsers` con `web-push`/DB mockeados). Falta (polish): generar los PNG de íconos `public/icons/icon-192.png` + `badge-72.png` (hoy el push usa el ícono por defecto del browser).

- **Step 9a (pagos MP — entrada de dinero, escrow reintegrable):** modelo escrow elegido en brainstorming (cliente prepaga el estimado a la cuenta MP de AlToque → `held`, reintegrable hasta completar/cancelar). `lib/mercadopago/`: `client.ts` (`mpConfig`, lanza sin `MP_ACCESS_TOKEN`), `preference.ts` (`buildJobPreferenceBody` + `createJobPreference` → Checkout Pro), `webhook.ts` (`isValidWebhookSignature` con el `WebhookSignatureValidator` oficial del SDK + `fetchPaymentInfo`), `refund.ts` (`refundJobPayment` total), `payments.ts` (`markPaymentHeld` idempotente por `isNull(mp_payment_id)`). `createJob` (transfer/card) crea preferencia, deja `paymentStatus='pending'` y devuelve `redirectUrl` (urgente: broadcast inmediato, pago en paralelo). Webhook `POST /api/webhooks/mercadopago` (firma → 401; idempotencia; `data.id` de query con fallback al body) → `held`. `updateJobStatus`: gate de `in_progress` sin pago + reintegro al cancelar si `held`. Cron `expire-jobs` también expira urgentes aceptados sin pagar y reintegra `held` expirados. Índice único parcial `uq_jobs_mp_payment_id` (en `postgis.sql`). UI: `JobPaymentPanel` (cliente), input de estimado + redirección en el wizard, banner "Esperando pago" + gate de Iniciar (pro). Tests: `tests/payments.test.ts` (schema, builder, firma con validador mockeado) + `tests/integration/payments.test.ts` (gateado por `TEST_DATABASE_URL`). Spec/plan en `docs/superpowers/`. **Pendiente activar:** `MP_ACCESS_TOKEN`/`MP_WEBHOOK_SECRET`/`NEXT_PUBLIC_APP_URL` en env, webhook + clave secreta en MP, re-correr `postgis.sql` en Supabase.

Pendiente (seguir el **Build Order**, Sección 9): pagos MP Step 9b (liquidación al completar: release/refund-down/upcharge + `commission_ledger` + payout del profesional + vista admin) → reviews (Step 10) → chat (Step 11) → admin completo (Step 12) → SEO (Step 13) → polish + deploy (Step 14).

### Nota importante sobre RLS
Las queries server-side usan Drizzle conectado por `DATABASE_URL` (rol owner del pooler) que **bypassa RLS**. RLS protege el camino del cliente (supabase-js en el browser) y es defensa en profundidad. Por eso toda Server Action server-side debe validar el rol explícitamente (`getSession`/`requireRole`) antes de mutar.
