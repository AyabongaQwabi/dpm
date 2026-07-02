# Credit wallet + policy pages — build prompt for Claude Code

**Date:** 2026-07-02  
**Build order:** Part 1 (credits) first, then Part 2 (policy pages). Part 2 can ship in parallel once schema is stable, but do not block Paystack activation on the full credit purchase flow — add footer links early.

---

## Goal

Move Service Pros from a direct pass-through payment model to a **credit-based wallet** where customers buy credits from Namoota Technology (1 credit = R1), spend credits on bookings, and providers are paid by Namoota on completion (manual payout queue for now). Simultaneously, publish four **Paystack-required policy pages** (privacy, terms, refund, delivery) that reflect the credit model — not the old direct-payment flow.

---

## Context

### What already exists

| Area | Location | Notes |
|------|----------|-------|
| Commission domain logic | `lib/domain/payments.ts` | `calculateCommissionFull()`, `checkPayoutEligibility()` — **not wired to booking creation** |
| Pricing config | `lib/pricing-config.ts`, `platform_config` table | `formatFee()`, `COMMISSION_BRACKETS`, `PLATFORM_CONFIG_SEED` |
| Booking checkout | `app/(public)/checkout/page.tsx` | Server action inserts booking with `payment_status: 'pending'` — **no payment, no commission calc** |
| Customer actions | `lib/actions/customer.ts` | Cancel, confirm completion, dispute — no credit/refund logic |
| Provider sales | `app/provider-dashboard/sales/page.tsx` | Shows `R` amounts from `final_price` / `provider_payout_amount` |
| Paystack stubs | `app/api/webhooks/paystack/route.ts`, `app/api/bookings/route.ts` | Empty `export {}` placeholders only |
| Policy placeholders | `app/(public)/privacy/page.tsx`, `terms/page.tsx` | Placeholder copy — must be replaced |
| Footer | `components/SiteFooter.tsx` | Links: About, Terms, Privacy — missing Refund + Delivery |
| Session guards | `lib/session.ts` | `requireCustomerSession()`, `requireProviderSession()` |
| DB baseline | `supabase/migrations/20260620000000_init.sql` | `bookings` has `final_price`, `commission_amount`, `provider_payout_amount`, `payment_status` |

### What is missing

- No `customer_credit_balance`, `credit_transactions`, or `provider_payouts` tables
- No Paystack initialize/verify/webhook implementation or env vars
- No credit purchase UI, wallet balance display, or transaction history
- No credit spend/refund on booking lifecycle
- No credits display convention (everything still shows `R`)
- No refund or delivery policy pages
- Customer/provider dashboard layouts have **no footer** — policy links must be added there too for Paystack review

### Known schema drift (fix as part of Part 1)

`checkout/page.tsx` inserts columns not in the baseline migration (`package_id`, `price_paid`, `notes`) and uses `auth_customer_id` while `customers` and `lib/session.ts` use `auth_provider_id`. Reconcile checkout inserts with the actual schema (later migrations added `service_packages`, etc.) before layering credits on top.

---

## Scope

### In scope

- Part 1: Credit wallet, purchase flow (Paystack), spend/refund, provider payout-due records, credits display across platform
- Part 2: Privacy, Terms, Refund, Delivery policy pages + footer links on all layouts

### Out of scope

- Automated provider payouts via Paystack (manual/batch only)
- Full dispute resolution workflow (support contact only)
- Credit expiry
- Credit transfer between accounts
- Second payment provider or duplicate Paystack integration

---

## Plan link

No separate plan doc. This prompt is the source of truth for this feature.

---

## Conventions (decide once, document in code)

### Display currency

Use **`{n} credits`** everywhere except the credit purchase screen.

- `R500` → `500 credits`
- `R1,250` → `1,250 credits`
- Purchase screen: `Pay R500 → receive 500 credits` (both units, clearly labelled)

Create a single formatter, e.g. `lib/format-credits.ts`:

```ts
export function formatCredits(amount: number): string {
  return `${amount.toLocaleString('en-ZA')} credits`
}
```

Replace all inline `R {n}` / `formatFee()` usage for **service prices and booking amounts**. Keep `formatFee()` for provider **subscription fees** on the pricing page (those are real Rand charges to Namoota, not credits).

### Amount storage

Store monetary/credit amounts as **whole-number credits** (integers). 1 credit = R1, no fractional credits. Document this in a comment at the top of the credit migration file.

`services.price` and booking `final_price` remain numeric in DB; treat them as credit values (no value migration needed).

### Legal entity

Policy pages and purchase copy reference **Namoota Technology** as the seller of credits and platform operator. The consumer-facing brand remains **Service Pros**.

### Support contact

Use a configurable support email in `platform_config` (key: `support_email`, default e.g. `support@servicepros.co.za`). Policy pages and dispute CTAs read from config.

---

# PART 1: Credit wallet and purchase system

## 1. Schema migration

Create `supabase/migrations/20260702000000_credit_wallet.sql`.

### `customers` table

```sql
ALTER TABLE customers
  ADD COLUMN credit_balance INTEGER NOT NULL DEFAULT 0
    CHECK (credit_balance >= 0);
```

### `credit_transactions` table

```sql
CREATE TYPE credit_transaction_type AS ENUM ('purchase', 'spend', 'refund');

CREATE TABLE credit_transactions (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  customer_id   TEXT NOT NULL REFERENCES customers (id),
  type          credit_transaction_type NOT NULL,
  -- Positive = credits in, negative = credits out
  amount        INTEGER NOT NULL CHECK (amount <> 0),
  description   TEXT NOT NULL,
  booking_id    TEXT REFERENCES bookings (id),
  -- Paystack reference for purchases; null for spend/refund
  paystack_ref  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX credit_transactions_customer_id_created_at_idx
  ON credit_transactions (customer_id, created_at DESC);
```

### `provider_payouts` table

```sql
CREATE TYPE provider_payout_status AS ENUM ('pending', 'processing', 'paid');

CREATE TABLE provider_payouts (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  booking_id          TEXT NOT NULL UNIQUE REFERENCES bookings (id),
  provider_id         TEXT NOT NULL REFERENCES providers (id),
  gross_amount        INTEGER NOT NULL,   -- credits (= final booking price)
  commission_amount   INTEGER NOT NULL,
  net_payout_amount   INTEGER NOT NULL,   -- gross - commission, in credits
  status              provider_payout_status NOT NULL DEFAULT 'pending',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX provider_payouts_provider_id_status_idx
  ON provider_payouts (provider_id, status);
```

Add `updated_at` trigger for `provider_payouts`.

### `platform_config` seeds

Add keys (values as JSONB numbers or arrays per existing convention):

| Key | Default | Description |
|-----|---------|-------------|
| `credit_pack_denominations` | `[100, 250, 500, 1000]` | Fixed purchase packs (credits = Rands) |
| `credit_purchase_min` | `50` | Minimum custom purchase (Rands/credits) |
| `credit_purchase_max` | `5000` | Maximum single transaction |
| `provider_payout_business_days` | `5` | Shown in provider dashboard copy |
| `support_email` | `"support@servicepros.co.za"` | Policy + dispute contact |

Seed via migration INSERT, matching patterns in `20260621000000_pricing_model.sql`.

### Types

Update `lib/db.ts` stubs (or regenerate via `supabase gen types typescript --linked`).

---

## 2. Domain layer — credits

Create `lib/domain/credits.ts` (pure functions, no DB):

```ts
export function canAfford(balance: number, price: number): boolean
export function shortfall(balance: number, price: number): number
export function assertPositiveCredits(amount: number): void
```

Create `lib/domain/credit-ledger.ts` for ledger invariants:

- Purchase: `+amount`, type `purchase`
- Spend: `-amount`, type `spend`, linked `booking_id`
- Refund: `+amount`, type `refund`, linked `booking_id`
- Balance change must always be accompanied by a `credit_transactions` row (enforced in server actions, not DB trigger for v1)

Unit tests in `lib/domain/__tests__/credits.test.ts`.

---

## 3. Paystack integration (credit purchases only)

Read Paystack docs: https://developers.paystack.co/docs

### Environment variables

Add to `.env.local.example`:

```
PAYSTACK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...
```

### API routes

**`app/api/payments/credits/initialize/route.ts`** (POST, authenticated customer)

1. `requireCustomerSession()` via server client
2. Read `amount` from body (integer credits/Rands)
3. Validate against `platform_config` min/max
4. Call Paystack `POST /transaction/initialize` with:
   - `amount` in **kobo** (amount × 100) — Paystack uses lowest currency unit; for ZAR, multiply Rand amount by 100
   - `email` from customer record
   - `metadata`: `{ customer_id, credit_amount, type: 'credit_purchase' }`
   - `callback_url`: `/customer-account/credits?status=success` (or dedicated confirmation page)
5. Return `{ authorization_url }` to client

**`app/api/webhooks/paystack/route.ts`** (replace stub)

1. Verify `x-paystack-signature` (HMAC SHA512 of raw body with secret key) — ARCH-018
2. Handle `charge.success` where `metadata.type === 'credit_purchase'`
3. Idempotency: if `paystack_ref` already exists in `credit_transactions`, return 200 without double-crediting
4. In a single admin-client transaction:
   - Insert `credit_transactions` (type `purchase`, positive amount, `paystack_ref`)
   - `UPDATE customers SET credit_balance = credit_balance + amount WHERE id = customer_id`

Use `createAdminClient()` for writes (bypasses RLS).

### Client purchase flow

**`app/customer-account/credits/page.tsx`** (new)

- Show current balance prominently
- Fixed pack cards from `credit_pack_denominations` config — each card: "Pay R{n} → receive {n} credits"
- Custom amount field with min/max validation
- On submit: call initialize route, redirect to Paystack `authorization_url`
- Support `?amount=` query param to pre-fill custom amount (for booking shortfall top-up)
- Success/cancel return handling with clear confirmation message

Do **not** build a second Paystack client — one webhook, one initialize route.

---

## 4. Credit wallet UI

### Customer overview (`app/customer-account/page.tsx`)

Add a wallet summary card: current balance + link "Buy credits" → `/customer-account/credits`.

### Account sidebar (`components/customer-account/AccountSidebar.tsx`)

Add nav item: **Credits** (or **Wallet**).

### Transaction history

On the credits page (or a sub-section `/customer-account/credits/history`):

- Paginated list from `credit_transactions`
- Columns: date, type (Purchase / Spent on booking / Refund), amount (+/-), description
- For spend/refund: link to booking detail

---

## 5. Spending credits on bookings

### Checkout changes (`app/(public)/checkout/page.tsx`)

Before the confirm button:

1. Load customer `credit_balance`
2. Display: "Your balance: {n} credits" and "This booking: {price} credits"
3. If insufficient: show shortfall + CTA linking to `/customer-account/credits?amount={shortfall}`

### `createBooking` server action (rewrite)

On booking confirmation:

1. `requireCustomerSession()` — use `auth_provider_id` consistently
2. Compute `finalPrice` via `applyDiscount()` from `lib/domain/payments.ts`
3. Load provider ceiling/bonus context; call `calculateCommissionFull()` — store `final_price`, `commission_amount`, `provider_payout_amount` on the booking row
4. **Atomic credit deduction** (admin client):
   - Verify `credit_balance >= finalPrice` (re-check inside transaction)
   - `UPDATE customers SET credit_balance = credit_balance - finalPrice`
   - Insert `credit_transactions` (type `spend`, amount negative, `booking_id`, description e.g. "Booking: {service title}")
   - Insert booking with `payment_status: 'captured'` (credits are committed at booking — no separate PSP capture for the service)
5. Create message thread as today
6. Redirect to confirmation

If deduction fails (race / insufficient balance), return error — do not create booking.

### Refund credits

Wire into existing booking state transitions in `lib/actions/customer.ts` and any provider decline actions:

| Event | Action |
|-------|--------|
| Customer cancels while `requested` | Refund full `final_price` credits |
| Provider declines `requested` booking | Refund full `final_price` credits |
| Booking auto-expired by cron (`app/api/cron/booking-expiry/route.ts`) | Refund full `final_price` credits |

Refund implementation (admin client, per event):

1. Insert `credit_transactions` (type `refund`, positive amount, `booking_id`)
2. `UPDATE customers SET credit_balance = credit_balance + amount`
3. Set `payment_status: 'refunded'` on booking (semantic: credits returned)

Do **not** issue cash refunds. Do **not** call Paystack refund API for booking cancellations.

---

## 6. Provider payout on completion

When customer calls `confirmCompletion()` (`lib/actions/customer.ts`):

1. Booking → `status: 'completed'` (existing)
2. Verify `payment_status === 'captured'` (credits were spent at booking)
3. Insert `provider_payouts` row:
   - `gross_amount` = `final_price` (integer credits)
   - `commission_amount`, `net_payout_amount` from booking row
   - `status: 'pending'`
4. Do **not** call Paystack transfer API

Update `checkPayoutEligibility()` in `lib/domain/payments.ts` or add `checkCreditPayoutEligibility()` — eligibility is `completed` + credits captured (not PSP capture). Document the semantic shift in a comment.

### Provider dashboard

**`app/provider-dashboard/sales/page.tsx`**

- Replace `R` display with `formatCredits()` for sale amounts
- For completed bookings with a `provider_payouts` row: show status badge
- Pending: "Payout of {net} credits (R{net}) is being processed — you'll receive it within {n} business days"
- Use `provider_payout_business_days` from config

Add payout status to sales table columns.

---

## 7. Credits display — platform-wide sweep

Replace Rand labels with credits for **service/booking amounts** in:

| File / area | Change |
|-------------|--------|
| `components/ServiceCard.tsx` | Price display |
| `components/ServiceListingCard.tsx` | Price display |
| `components/PackageSelector.tsx` | Tab prices |
| `app/(public)/checkout/page.tsx` | Order summary |
| `app/(public)/services/[id]/page.tsx` | Package pricing |
| `app/customer-account/bookings/page.tsx` | Amount paid |
| `app/customer-account/page.tsx` | Booking amounts |
| `app/provider-dashboard/sales/page.tsx` | Earnings (label as credits; optional R equivalent in payout pending copy only) |
| Provider service create/edit forms | Input label: "Price (credits)" placeholder: "e.g. 500" |
| `app/(public)/pricing/page.tsx` | Bracket table + worked examples: replace `R` job amounts with credits; keep `R` for monthly subscription fees |

Grep for `R `, `R{`, `formatFee` on service/booking surfaces and fix systematically.

---

## 8. Reconcile booking schema

Before or during credit work, align `createBooking` with the live schema:

- Use correct auth column (`auth_provider_id`)
- Populate `final_price`, `commission_amount`, `provider_payout_amount` (required NOT NULL in baseline)
- Map `package_id` / `service_packages` per later migrations
- Remove orphan columns (`price_paid`) if not in schema

Run `supabase db push` locally and verify checkout insert succeeds.

---

## Part 1 acceptance

- [ ] Customer can buy credits via Paystack (pack + custom amount)
- [ ] Webhook credits wallet exactly once per successful charge (idempotent)
- [ ] Wallet balance visible on overview and checkout
- [ ] Booking deducts credits atomically; insufficient balance blocks booking with top-up link
- [ ] Cancel/decline/expiry refunds credits to wallet, not cash
- [ ] Completion creates `provider_payouts` pending row with correct commission split
- [ ] All service/booking prices show credits, not Rands (except purchase screen + provider subscription fees)
- [ ] `npm run build` passes; credit domain tests pass
- [ ] `platform_config` drives pack denominations and min/max — not hardcoded

---

# PART 2: Policy pages (Paystack activation)

## 1. Pages

Replace placeholders and add new routes under `app/(public)/`:

| Route | File | Action |
|-------|------|--------|
| `/privacy` | `privacy/page.tsx` | Replace placeholder |
| `/terms` | `terms/page.tsx` | Replace placeholder |
| `/refund` | `refund/page.tsx` | **New** |
| `/delivery` | `delivery/page.tsx` | **New** |

Use the same layout pattern as existing policy pages (`max-w-4xl`, typography from design system). Public layout already wraps `SiteNav` + `SiteFooter`.

### Content requirements

All pages must reflect the **credit-based model**. Write complete, production-quality legal copy (not lorem ipsum). Key points per page:

**Privacy** — collection (name, email, phone, location, payment via Paystack), use (marketplace ops, bookings, comms), sharing (providers for fulfilment, Paystack, no data sale), POPIA rights (access, correct, delete), contact Namoota Technology, cookies, Paystack's own privacy policy link.

**Terms** — 18+, SA residents, account required; marketplace intermediary (Namoota not party to service contracts); credit terms (1 credit = R1, purchased from Namoota, no cash value, non-transferable, non-withdrawable); credits deducted at booking confirmation; provider accept/decline rights; review policy (post-completion only); provider obligations; prohibited conduct; suspension/termination; limitation of liability; governing law: Republic of South Africa.

**Refund** (critical for Paystack) — credit purchases non-refundable as cash; booking cancel before work / provider decline → full credit wallet refund; disputes → contact support, discretionary credit refund only, no cash; **CPA 68 of 2008 statutory cash refund exception**; how to request (support email from config).

**Delivery** — services marketplace not product delivery; timelines set per provider listing; customer should review stated delivery time; delays → contact support; Namoota assists disputes but not responsible for provider delays.

Include "Last updated: {date}" at top of each page.

## 2. Footer links

**`components/SiteFooter.tsx`** — Company column:

- About
- Terms of Service → `/terms`
- Privacy Policy → `/privacy`
- Refund Policy → `/refund`
- Delivery Policy → `/delivery`

**Authenticated layouts** — customer and provider dashboards do not use `SiteFooter`. Add a compact policy link bar (same four links + About) to:

- `app/customer-account/layout.tsx`
- `app/provider-dashboard/layout.tsx`

Paystack may browse from any page; links must resolve without auth.

## Part 2 acceptance

- [ ] All four policy URLs return 200 without login
- [ ] Footer/policy bar links present on public, customer, and provider layouts
- [ ] Refund policy explicitly states credits-not-cash + CPA exception
- [ ] Terms state credit system rules (non-transferable, no cash withdrawal)
- [ ] Delivery policy explains provider-set timelines for services
- [ ] Pages match site design system (not unstyled HTML)

---

## Implementation order (suggested)

1. Migration + types + `platform_config` seeds
2. `lib/domain/credits.ts` + tests
3. Paystack initialize + webhook (test with Paystack test keys)
4. Credit purchase page + wallet balance on overview
5. Reconcile booking schema + wire commission calc
6. Credit spend on booking + refund paths
7. Provider payout record + sales UI
8. Credits display sweep
9. Policy pages + footer links (can start after step 1 if Paystack is waiting)

---

## Files to create or heavily modify

### New

- `supabase/migrations/20260702000000_credit_wallet.sql`
- `lib/domain/credits.ts`, `lib/domain/__tests__/credits.test.ts`
- `lib/format-credits.ts`
- `lib/actions/credits.ts` (purchase verify helpers if needed)
- `app/customer-account/credits/page.tsx`
- `app/api/payments/credits/initialize/route.ts`
- `app/(public)/refund/page.tsx`
- `app/(public)/delivery/page.tsx`

### Modify

- `app/api/webhooks/paystack/route.ts`
- `app/(public)/checkout/page.tsx`
- `lib/actions/customer.ts`
- `app/customer-account/page.tsx`
- `components/customer-account/AccountSidebar.tsx`
- `components/SiteFooter.tsx`
- `app/customer-account/layout.tsx`
- `app/provider-dashboard/layout.tsx`
- `app/provider-dashboard/sales/page.tsx`
- `app/(public)/privacy/page.tsx`, `terms/page.tsx`
- `app/(public)/pricing/page.tsx`
- Service price components (grep `R ` / `formatFee`)
- `lib/db.ts`
- `.env.local.example`

---

## Reference docs

- `docs/docs/dpm_pricing_model_source_of_truth.docx` — commission brackets (unchanged; commission now comes from Namoota's credit revenue)
- `docs/prompts/pricing.md` — prior pricing implementation prompt
- `CLAUDE.md` — Supabase-only data access, `createAdminClient` for writes
- Paystack: https://developers.paystack.co/docs
