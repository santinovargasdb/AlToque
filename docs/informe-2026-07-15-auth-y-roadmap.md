# Informe de cambios — 2026-07-15

Estabilización de auth en producción + implementación del roadmap pendiente (Steps 9b, 10, 11, 12).
Verificación final: `pnpm typecheck` ✅ · `pnpm lint` ✅ · `pnpm test` ✅ (45 tests) · `pnpm build` ✅ (39 rutas).

---

## 1. Historial de cambios

### Fase 1 — Seguridad, validación de entradas y estabilidad del auth

| Archivo | Cambio | Por qué |
|---|---|---|
| `src/lib/validations/auth.ts` **(nuevo)** | `emailSchema` estricto (regex con TLD obligatorio + normalización), `EMAIL_INPUT_PATTERN` (para el `pattern` HTML5), `PASSWORD_RULES` + `passwordSchema` (mín 8, letra, número, especial, máx 72), `signUpSchema`, `signInSchema`, `resetRequestSchema`, `updatePasswordSchema`, validación de rutas internas anti open-redirect. | Única fuente de verdad de las reglas: el mismo schema valida en el browser (tiempo real) y en el servidor (Server Actions). |
| `src/lib/url.ts` **(nuevo)** | `getRequestOrigin()`: origen real de la request vía `x-forwarded-host`/`x-forwarded-proto` con fallback a `NEXT_PUBLIC_APP_URL`. | Detrás del proxy de Vercel el host interno puede ser `localhost:3000`; los `emailRedirectTo` deben construirse con el host público. |
| `src/app/auth/callback/route.ts` | `resolveBaseUrl()`: en dev usa el origin local; en prod usa `x-forwarded-host` (fallback `NEXT_PUBLIC_APP_URL`). `next` ahora rechaza `//dominio` (open redirect). Los links `type=recovery` aterrizan en `/restablecer`. | **Fix del bug localhost vs producción**: el callback redirigía con `request.nextUrl.origin`, que en Vercel puede resolver a `localhost:3000`. |
| `src/lib/actions/auth.ts` | Nuevas Server Actions: `signUpWithPassword`, `signInWithPassword`, `requestPasswordReset`, `updatePassword` (todas re-validan con Zod y traducen errores de Supabase al español; detección de email ya registrado vía `identities.length === 0`). `signOut` se mantiene. | Registro/login con contraseña con validación server-side estricta; el cliente nunca es la única barrera. |
| `src/components/auth/password-fields.tsx` **(nuevo)** | Campos fijos Contraseña + Repetir contraseña con checklist de requisitos en tiempo real (desde `PASSWORD_RULES`). | Feedback inmediato que nunca diverge de lo que exige el servidor. |
| `src/components/auth/password-signup-form.tsx` **(nuevo)** | Form de registro con campos fijos (nombre, teléfono, email, contraseña ×2), `pattern` estricto de email, submit deshabilitado hasta cumplir reglas, estado "Revisá tu email" si hay confirmación pendiente. | Caja de creación de contraseñas pedida en Fase 1. |
| `src/components/auth/password-login-form.tsx` **(nuevo)** | Login email+contraseña + modo "¿La olvidaste?" (envía email de recuperación). | Login estable en producción con recovery completo. |
| `src/components/auth/login-flow.tsx` **(nuevo)** | Alterna contraseña (default) ↔ código OTP en `/ingresar`. | Los usuarios existentes (creados por OTP) no tienen contraseña; se preserva ese camino. |
| `src/components/auth/registro-flow.tsx` | Igual que login: método contraseña (default) ↔ OTP tras elegir rol. | Ídem. |
| `src/components/auth/otp-form.tsx` | Email con `pattern` estricto + validación Zod al enviar (`emailSchema`). | Formato de email estricto también en el flujo OTP. |
| `src/app/(auth)/ingresar/page.tsx` | Usa `LoginFlow`; `returnUrl` endurecido contra `//`; muestra el `?error=` del callback como banner. | UI del nuevo login + feedback de errores del callback. |
| `src/app/(auth)/restablecer/page.tsx` **(nuevo)** + `src/components/auth/reset-password-form.tsx` **(nuevo)** | Página y form de nueva contraseña (requiere la sesión creada por el link de recovery; si venció redirige a `/ingresar` con mensaje). | Cierra el circuito de recuperación de contraseña. |
| `tests/auth-validation.test.ts` **(nuevo)** | 24 tests: emails válidos/ inválidos/normalización, reglas de contraseña, coincidencia, teléfono, open redirect. | Regresión de las reglas de Fase 1. |

### Fase 2 — Roadmap pendiente

**Step 9b — Liquidación al completar (pagos MP):**

| Archivo | Cambio | Por qué |
|---|---|---|
| `src/lib/mercadopago/refund.ts` | Nuevo `refundJobPaymentPartial(paymentId, amount)`. | Reintegrar la diferencia cuando el precio final < estimado prepagado. |
| `src/lib/actions/job.ts` (`completeJob`) | Liquidación completa en transacción: comisión vía `commission.ts` (regla #4); **cash** → `paid_cash` + ledger `cash_debt/owed`; **prepago `held`** → reintegro parcial si corresponde (si MP falla, NO completa: criterio conservador) → `released` + ledger `split/collected`; incremento de `jobs_completed`. Gate: prepago sin `held` no puede completarse. | Era el TODO central del Step 9b: hasta ahora completar un trabajo no registraba nada en `commission_ledger` ni movía el escrow. |
| `src/components/app/job-detail-view.tsx` | Nota de liquidación (`SettlementNote`): explica reintegro de diferencia o excedente a abonar directo al profesional. | Transparencia del modelo estimado vs final. **Decisión técnica:** si el final supera el estimado, el excedente se cobra directo (sin segundo Checkout por MP en esta etapa) porque el schema tiene un solo `mp_payment_id` por job; la comisión igual se calcula sobre el final completo. |
| `src/app/(pro)/pro/cobros/page.tsx` | Página real (antes ComingSoon): totales (trabajos, facturado, neto, deuda por efectivo) + detalle del ledger. | Vista de ganancias del profesional. |
| `src/lib/actions/admin.ts` | Nueva `settleCommission(ledgerId)`: `owed → settled` (solo admin, transición atómica con `WHERE status='owed'`). | El profesional salda su deuda de trabajos en efectivo y el admin lo registra. |
| `src/components/admin/settle-commission-button.tsx` **(nuevo)** | Botón "Saldar" con toast. | UI de la acción anterior. |
| `src/app/(admin)/admin/comisiones/page.tsx` | Página real: totales cobrado/adeudado/saldado + tabla del ledger con profesional y trabajo. | Vista admin del Step 9b. |

**Step 10 — Reviews:**

| Archivo | Cambio | Por qué |
|---|---|---|
| `src/lib/actions/review.ts` **(nuevo)** | `submitReview`: solo trabajos `completed`, solo las partes, target forzado a la contraparte, única por job+autor (pre-check + unique de DB), recalcula `rating_avg` del profesional en la misma transacción. | Reseñas bidireccionales confiables (rating siempre consistente). |
| `src/components/shared/review-form.tsx` **(nuevo)** | Selector de estrellas accesible (radiogroup) + comentario. | UI de reseña. |
| `src/components/shared/review-summary.tsx` **(nuevo)** | Reseña propia ya enviada (solo lectura). | Evita re-render del form tras reseñar. |
| `src/app/(app)/pedido/[id]/page.tsx` y `src/app/(pro)/pro/pedido/[id]/page.tsx` | Al completar: muestran `ReviewForm` o `ReviewSummary` (cliente → profesional y viceversa). | Integración en el ciclo del pedido. El perfil público ya mostraba reseñas (Step 5). |

**Step 11 — Chat en tiempo real:**

| Archivo | Cambio | Por qué |
|---|---|---|
| `src/lib/validations/message.ts` **(nuevo)** | `sendMessageSchema` (1–2000 chars). | Validación Zod de la mutación (regla del proyecto). |
| `src/lib/actions/message.ts` **(nuevo)** | `sendMessage`: solo las partes, estados accepted/in_progress/completed; inserta y devuelve el mensaje serializado; notificación in-app + Web Push a la contraparte (tag `chat-{jobId}` colapsa pushes). | Mutación del chat. |
| `src/components/shared/job-chat.tsx` **(nuevo)** | Chat con SSR de historial + suscripción Realtime (`postgres_changes` INSERT filtrado por `job_id`; RLS ya limita a las partes) + append optimista dedupeado por id; solo lectura al completar; autoscroll. | Entrega en vivo sin polling. La publication de Realtime ya incluía `messages` (postgis.sql). |
| `src/lib/db/queries.ts` | Nuevos `getJobMessages` (serializados) y `getJobReviewByAuthor`. | Lecturas SSR para chat y reviews. |
| `src/app/(app)/mensajes/page.tsx` | Página real (antes ComingSoon): conversaciones del cliente con último mensaje (`selectDistinctOn`) y estado del pedido. | Bandeja de mensajes. |
| Detalles de pedido (ambos) | Montan `JobChat` cuando hay profesional asignado y el estado lo permite. | Integración. |

**Step 12 — Admin:**

| Archivo | Cambio | Por qué |
|---|---|---|
| `src/app/(admin)/admin/page.tsx` | KPIs reales: profesionales verificados, pedidos completados, GMV, comisión cobrada. | Antes eran "—". |
| `src/app/(admin)/admin/trabajos/page.tsx` | Tabla global de pedidos (alias de Drizzle para cliente/profesional, estado, precio). | Antes ComingSoon. |
| `src/app/(admin)/admin/profesionales/page.tsx` | Tabla de profesionales (verificación, rating, trabajos, online). | Antes ComingSoon. |

**Otros:**

| Archivo | Cambio |
|---|---|
| `CLAUDE.md` | Estado del scaffold actualizado (9b/10/11/12 + auth hardening; pendientes reales: payout automático/upcharge MP, SEO, polish). |
| `.env.local` **(nuevo, gitignoreado)** | Placeholders mínimos solo para `pnpm build` local. Reemplazar por valores reales para desarrollo. |

### Qué queda pendiente del roadmap
- **Extensión 9b:** payout automático al profesional (hoy batch/manual por diseño del spec 9a) y cobro del excedente vía MP (requiere tabla `job_payments` o columna extra para un segundo `mp_payment_id`).
- **Step 13 (SEO)** y **Step 14 (polish + deploy):** perfil del cliente editable, `/pro/mensajes`, íconos PNG del push, e2e.

---

## 2. Tareas manuales requeridas (Vercel / Supabase / Mercado Pago)

### Supabase (Dashboard)

1. **Authentication → Providers → Email**: habilitar **Email + Password** (además del OTP existente). Dejar activa la confirmación de email ("Confirm email") recomendado.
2. **Authentication → URL Configuration**:
   - **Site URL**: `https://<tu-dominio>.vercel.app` (o dominio propio). *Este era el origen del bug de localhost: si queda `http://localhost:3000`, los links de email redirigen ahí.*
   - **Redirect URLs** (allow list): agregar
     - `https://<tu-dominio>.vercel.app/auth/callback`
     - `http://localhost:3000/auth/callback` (para dev)
     - Si usás previews de Vercel: `https://*-<tu-team>.vercel.app/auth/callback`
3. **Authentication → Email Templates**: además del template de OTP (`{{ .Token }}`, ya requerido por el Step 3), verificar que **Confirm signup** y **Reset password** usen `{{ .ConfirmationURL }}` (el flujo de recovery aterriza en `/restablecer`).
4. **SQL**: no hay cambios de schema en esta entrega (reviews/messages/ledger ya existían con RLS). Si nunca se corrió, ejecutar `drizzle/postgis.sql` (incluye el índice `uq_jobs_mp_payment_id` del Step 9a y la publication Realtime de `messages`).

### Vercel (Settings → Environment Variables, entorno Production)

| Variable | Valor / Nota |
|---|---|
| `NEXT_PUBLIC_APP_URL` | **`https://<tu-dominio>.vercel.app`** — crítico: es el fallback del callback y la base de `back_urls`/`notification_url` de MP. |
| `DATABASE_URL` | Pooler de Supabase (puerto 6543). |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Desde Supabase → Settings → API. |
| `MP_ACCESS_TOKEN` / `MP_WEBHOOK_SECRET` | **Necesarios para el Step 9a/9b** (checkout, webhook, reintegros totales y parciales). |
| `MP_CLIENT_ID` / `MP_CLIENT_SECRET` / `NEXT_PUBLIC_MP_PUBLIC_KEY` | Para OAuth/Bricks futuros (opcionales hoy). |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` / `GOOGLE_MAPS_SERVER_KEY` | Maps/Places + geocoding server. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push (el chat y el dispatch pushean; sin claves es no-op). |
| `CRON_SECRET` | Protege `/api/cron/expire-jobs` (ya agendado en `vercel.json`). |
| `COMMISSION_RATE` | Ej. `0.12`. |
| `RESEND_API_KEY` | Opcional (email transaccional futuro). |

> Tras cambiar env vars: **Redeploy**.

### Mercado Pago (Tus integraciones)

1. Configurar el **webhook** de la app apuntando a `https://<tu-dominio>.vercel.app/api/webhooks/mercadopago` (evento *Pagos*).
2. Copiar la **clave secreta** del webhook a `MP_WEBHOOK_SECRET` (sin ella el endpoint responde 401 por diseño).
3. Los **reintegros parciales** (Step 9b) usan el mismo `MP_ACCESS_TOKEN`; no requiere configuración extra.

### Checklist de humo post-deploy

1. Registro con contraseña → llega email de confirmación → el link **redirige al dominio de producción** (no a localhost) → sesión activa.
2. Login con contraseña incorrecta → "Email o contraseña incorrectos."; recovery → `/restablecer` → nueva contraseña OK.
3. Pedido transfer/card → Checkout MP → webhook pasa a `held` → completar con precio menor al estimado → reintegro parcial visible en MP + ledger `split/collected` + `/pro/cobros` actualizado.
4. Pedido cash completado → deuda en `/pro/cobros` y en `/admin/comisiones` → botón **Saldar**.
5. Chat entre cliente y profesional en un pedido aceptado (dos browsers) → mensajes en vivo + push.
6. Reseña del cliente al completar → rating actualizado en `/profesional/[id]`.
