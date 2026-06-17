# Step 9a — Mercado Pago payments: "Money in, safely refundable"

**Date:** 2026-06-17
**Status:** Approved (design) — ready for implementation plan
**Scope:** First slice of Step 9 (pagos MP). Money inflow + escrow hold + refunds only.
Completion settlement is **Step 9b** (separate spec).

---

## 1. Context

AlToque connects clients with verified tradespeople. Payment is hybrid:

- **`cash`** → no MP; the provider collects directly and *owes* AlToque the commission.
- **`transfer` / `card`** → paid through Mercado Pago.

The DB schema is already fully provisioned for this step (no schema redesign needed):

- `jobs.paymentStatus` enum: `none | pending | held | released | paid_cash | refunded`
- `jobs.priceEstimate`, `jobs.finalPrice`, `jobs.commissionRate` (snapshot), `jobs.commissionAmount`
- `jobs.mpPreferenceId`, `jobs.mpPaymentId`
- `provider_profiles.mpUserId`, `provider_profiles.mpConnected`
- `provider_mp_tokens` (service_role-only via RLS; `accessToken` "encriptado")
- `commission_ledger` (`source: split | cash_debt`, `status: collected | owed | settled`)

The `mercadopago` SDK (v2.1.0) is installed. `lib/mercadopago/commission.ts` is the **single
source of truth** for the commission (non-negotiable #4) and already works. `completeJob` already
sets `finalPrice` + `commissionAmount` but leaves a TODO for the ledger/payment.

### Decisions taken during brainstorming

| # | Decision | Choice |
|---|----------|--------|
| 1 | Payment moment | **Upfront at job creation** |
| 2 | Hold & split model | **Escrow via AlToque** (collect to AlToque's MP account, `held` → `released`) |
| 3 | Payout to provider | **Mark `released` + ledger; manual/batch disbursement** (no programmatic MP money-out this step) |
| 4 | Estimate vs final price | **Full settlement** (refund if lower, second charge if higher) — *in 9b* |
| 5 | Slicing | **Two slices**: 9a money-in, 9b settlement |
| 6 | Urgent prepay sequencing | **Broadcast immediately, pay in parallel** — made safe by gating *progression*, not visibility |

---

## 2. Goal of 9a

A client paying by transfer/card prepays the **price estimate** into AlToque's own MP account.
The money is securely **held** and **fully refundable** until the job either completes (→ 9b) or is
cancelled/expires (→ refund). No completion/settlement logic and **no `commission_ledger` writes**
in this slice.

### Slicing boundary (important)

Both ledger writes (`split` and `cash_debt`) happen at **`completeJob`**, which belongs to 9b.
Therefore:

- **9a owns:** `createJob` (prepaid branch), the webhook, refund-on-cancel/expire, the urgent
  progression gate, and the related UI.
- **9a does NOT touch:** `completeJob`, `commission_ledger`.
- Cash's commission (`cash_debt`, `owed`) is recorded at completion → **9b** (cash never prepays).

---

## 3. Components & data flow

### 3.1 Estimate capture

- `lib/validations/job.ts` → `createJobSchema`: add `priceEstimate: z.coerce.number().positive().max(100_000_000).optional()`,
  with a `.refine` requiring it to be present (`> 0`) when `paymentMethod !== "cash"`. Cash ignores it.
- `components/app/new-order-wizard.tsx` step 3: render a "Precio estimado (ARS)" input **only** when
  the transfer/card option is selected. Pass `priceEstimate` to `createJob`.
- `createJob` writes `priceEstimate` to `jobs.priceEstimate`.

### 3.2 MP client + env

- New `lib/mercadopago/client.ts` (`"server-only"`): construct `MercadoPagoConfig` with
  `MP_ACCESS_TOKEN`; export configured `Preference` and `Payment` clients. Throw a clear error if
  `MP_ACCESS_TOKEN` is missing **when used** (not at import).
- `lib/env.ts`: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` stay **optional** in the Zod schema so a
  cash-only dev/build works without MP keys (same spirit as the Web Push no-op). The payment code
  paths guard at call time and surface a friendly error.

### 3.3 `createJob` — prepaid branch

```
createJob(input)
├─ cash            → unchanged; paymentStatus='none'
└─ transfer/card   →
     1. insert job (status: scheduled→'requested' | urgent→'broadcasting'),
        paymentStatus='pending', priceEstimate set, location set (as today)
     2. (urgent only) fire broadcast NOW — job_dispatch + dispatchNewUrgentJob (unchanged, parallel)
     3. Preference.create:
          transaction_amount/items amount = priceEstimate
          external_reference = jobId
          notification_url   = `${NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`
          back_urls          = `${APP_URL}/pedido/${jobId}?pago=success|failure|pending`
          auto_return        = 'approved'
     4. store jobs.mpPreferenceId
     5. return { ok:true, jobId, redirectUrl: preference.init_point }
```

- The `Preference.create` call is a network call → performed **outside** the DB transaction. If it
  fails, mark the job `cancelled` (paymentStatus stays `none`/`pending`) and return an error so the
  client isn't left with a dangling unpayable job.
- `CreateJobResult` gains an optional `redirectUrl?: string`.
- Wizard `submit()`: if `res.redirectUrl` → `window.location.href = res.redirectUrl` (external MP
  Checkout Pro); else `router.push(\`/pedido/${res.jobId}\`)` as today.

### 3.4 Webhook `POST /api/webhooks/mercadopago` (security-critical core)

Non-negotiable #2: verify signature of **all** MP webhooks + idempotency by `mp_payment_id`.

```
POST /api/webhooks/mercadopago
1. Read headers: x-signature (contains ts=, v1=), x-request-id. Read body (topic=payment, data.id).
2. Signature verify:
     manifest = `id:${data.id};request-id:${xRequestId};ts:${ts};`
     expected = HMAC_SHA256(MP_WEBHOOK_SECRET, manifest) hex
     constant-time compare(expected, v1) → mismatch ⇒ 401
3. Fetch payment: Payment.get(data.id) → { status, external_reference (=jobId) }
4. Idempotency: load job by id. If job.mpPaymentId === data.id ⇒ 200 (no-op).
     (Enforced at DB level by a UNIQUE index on jobs.mp_payment_id.)
5. If payment.status === 'approved':
     update jobs set paymentStatus='held', mpPaymentId=data.id where id=jobId
6. Return 200 quickly.
```

- Runs with Drizzle (service_role path) — **no user session**; the caller is Mercado Pago.
- New migration: `CREATE UNIQUE INDEX ... ON jobs (mp_payment_id) WHERE mp_payment_id IS NOT NULL;`
  (partial unique — many rows have NULL).
- Signature/idempotency logic lives in a pure, unit-testable helper
  (`lib/mercadopago/webhook.ts`) separate from the route handler.

### 3.5 Urgent safety — gate progression, not visibility

"Broadcast immediately, pay in parallel" means providers can see an urgent job before its money is
secured. We close the hole by gating **what can happen next**, not what's visible:

- A provider may **accept** an urgent unpaid job (race-safe `acceptJob`, unchanged).
- `updateJobStatus("in_progress")` is **blocked** unless `paymentStatus='held'` → returns a clear
  error. The pro job page shows an **"Esperando pago del cliente"** banner in place of "Iniciar".
- **Abandonment:** extend `app/api/cron/expire-jobs/route.ts` to also expire urgent jobs stuck in
  `broadcasting`/`accepted` with `paymentStatus IN ('none','pending')` beyond the TTL → `expired`.
  No money was held ⇒ nothing to refund; the provider is freed. Matching `job_dispatch` rows →
  `expired` (as today).

### 3.6 Refund on cancel / expire (the "safely refundable" half)

- `lib/mercadopago/refund.ts`: full refund via `POST /v1/payments/{mpPaymentId}/refunds` (SDK
  `Payment.refund` / `PaymentRefund`).
- `updateJobStatus("cancelled")`: if `paymentStatus='held'` → call refund → set
  `paymentStatus='refunded'`. (`pending`/`none` → just cancel, nothing to refund.)
- Edge: a *held* job that still expires (paid but never accepted) → refund → `refunded`. Handle in
  the cron alongside §3.5.

### 3.7 UI

- **Client job detail (`/pedido/[id]`):**
  - Payment status badge: Pendiente / Retenido / Reintegrado (+ existing statuses).
  - **"Pagar"** CTA shown when `paymentStatus='pending'` → re-opens the Checkout, reconstructed
    from the stored `mpPreferenceId`
    (`https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=<mpPreferenceId>`), so no extra
    column is needed.
  - Back-url toast driven by `?pago=success|failure|pending`.
- **Pro job detail (`/pro/pedido/[id]`):** "Esperando pago del cliente" banner + gated "Iniciar"
  when accepted & not yet `held`.

---

## 4. Error handling

- Missing MP env at a payment code path → friendly action error ("Pagos no disponibles"), never a
  crash; cash flow unaffected.
- `Preference.create` failure → job rolled back to `cancelled`, error returned to wizard.
- Webhook: bad signature → 401; unknown/again-seen payment → 200 no-op; payment not `approved` →
  200, no state change.
- Refund API failure → keep `paymentStatus='held'`, surface error, do **not** mark `cancelled`
  silently (so money isn't "lost" in state). Log for manual follow-up.

---

## 5. Testing (Vitest)

Pure/unit:
- `lib/mercadopago/webhook.ts`: signature verify (valid + tampered + missing header), manifest
  construction.
- Preference builder shape: amount = estimate, `external_reference`, `notification_url`, `back_urls`.

Integration (gated by `TEST_DATABASE_URL`, MP SDK mocked — same pattern as
`tests/integration/dispatch.test.ts`):
- prepaid `createJob` → `paymentStatus='pending'` + `mpPreferenceId` set + `redirectUrl` returned.
- webhook approved → `paymentStatus='held'`, `mpPaymentId` set; second delivery → no-op.
- cancel a `held` job → refund called → `paymentStatus='refunded'`.
- `updateJobStatus("in_progress")` on an unpaid urgent job → rejected.

`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all green. No `any` (non-negotiable #1).

---

## 6. Out of scope (→ Step 9b)

- `completeJob` settlement: release / refund-down / second-charge upcharge.
- All `commission_ledger` writes (`split` collected, `cash_debt` owed).
- Provider payout-destination capture (MP connection / alias / CBU).
- Admin payout view (released jobs → net owed to providers → mark paid).

---

## 7. Non-negotiables touched

- **#2** MP webhook signature verification + idempotency by `mp_payment_id` — core of §3.4.
- **#1** TypeScript strict, no `any`.
- **#4** Commission only in `commission.ts` — *not invoked in 9a* (no settlement here), preserved for 9b.
- **#5** No secrets committed; MP env validated/guarded.
- **#3** `provider_mp_tokens` untouched in 9a (escrow collects to AlToque's account; provider
  tokens are a 9b concern, if needed at all given manual payout).
