# Reportes, panel de admin y suspensión: plan

**Goal:** punto 5 del spec `docs/superpowers/specs/2026-11-06-reportes-y-cierre-design.md`. El cierre por el cliente (punto 6) va en un plan aparte.

**Architecture:** tabla `job_reports` solo accesible desde el servidor. Server Actions en `lib/actions/report.ts`, validadas con Zod. La suspensión reutiliza `verification_status = 'rejected'` y pausa la suscripción en Mercado Pago fuera de la transacción.

**Tech Stack:** Next.js 15, Drizzle, Vitest contra el Postgres de test.

## Global Constraints

- TypeScript strict, sin `any`. Cada componente en su archivo, 300 líneas como máximo.
- Mobile-first: cada vista funciona en 360px.
- RLS habilitado en toda tabla nueva.
- Ejecución inline: el commit y el push los decide el usuario.

---

## Task 1: Modelo y validación

**Files:** `src/lib/db/schema.ts`, migración `0006`, `src/lib/validations/report.ts`, `tests/helpers/test-db.ts`.

**Produces:**
- Enums `report_reason` y `report_status`; tabla `jobReports`; único `(job_id, reporter_id)`.
- `REPORT_REASONS`, `REPORT_REASON_LABELS`, `createReportSchema { jobId, reason, description }`, `resolveReportSchema { reportId, note }`.

La migración termina con `ALTER TABLE "job_reports" ENABLE ROW LEVEL SECURITY`.

## Task 2: Reportar

**Files:** `src/lib/actions/report.ts`, `tests/integration/job-reports.test.ts`.

**Produces:** `createJobReport(input): Promise<ActionResult>`.

Tests:
- Cliente y profesional reportan; `target_id` lo fija el servidor.
- Un ajeno no puede reportar.
- `requested` y `broadcasting` no se pueden reportar.
- Un segundo reporte de la misma parte da error, y dos envíos simultáneos dejan una sola fila.
- Descripción corta o motivo inválido dan error.

## Task 3: Resolver y suspender

**Files:** `src/lib/actions/report.ts`, `src/lib/mercadopago/subscriptions.ts` (sin cambios de interfaz), `src/lib/notifications/verification.ts`.

**Produces:**
- `resolveReport(input, outcome: "resolved" | "dismissed"): Promise<ActionResult>`.
- `suspendReportedProvider(input): Promise<SuspendResult>`, con `SuspendResult = { ok: true; warning?: string } | { ok: false; error: string }`.
- `notifyProviderSuspended({ providerId, reason })`.

Tests:
- Solo un admin puede resolver, descartar o suspender.
- Un reporte ya cerrado no se vuelve a cerrar.
- Suspender deja `rejected`, el motivo, `is_online = false` y el reporte `resolved`.
- Con suscripción activa: pausa en Mercado Pago y deja `paused` con `subscription_active = false`.
- Sin suscripción: no llama a Mercado Pago.
- Si falla Mercado Pago: la suspensión queda aplicada, con `warning`, y la suscripción no cambia.
- Un reporte contra un cliente no permite suspender.

## Task 4: Pantallas

**Files:**
- `src/components/shared/report-job-form.tsx`, montado en `/pedido/[id]` y `/pro/pedido/[id]`.
- `src/lib/db/queries.ts`: `hasReportedJob(jobId, reporterId)`.
- `src/app/(admin)/admin/reportes/page.tsx`, `src/components/admin/report-actions.tsx`.
- Menú y KPI de reportes abiertos en el admin.
- Texto "Soporte ante reclamos" en `/pro/suscripcion`.

Verificación: `pnpm typecheck`, `pnpm lint`, `pnpm build` y la suite completa con `TEST_DATABASE_URL`.
