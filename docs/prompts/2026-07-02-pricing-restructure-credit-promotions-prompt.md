# Pricing restructure + customer credits page + promotions — build prompt for Claude Code

**Date:** 2026-07-02  
**Depends on:** [`2026-07-02-credit-system-policy-pages-prompt.md`](2026-07-02-credit-system-policy-pages-prompt.md) (credit wallet, Paystack, `credit_transactions` table must exist)

Read all three parts before starting. Part 1 and Part 2 can be done in parallel once the shared component extraction is planned; Part 3 touches purchase flow and must follow Part 2 UI structure.

---

## Goal

1. Move **provider** pricing (subscriptions, commission brackets, ceiling packages) off `/pricing` into a tab on the existing Get Listed page.
2. Replace `/pricing` with a **customer-facing credits** explainer and purchase entry point.
3. Add a **JSON-driven promotion system** that awards bonus credits on purchases, with full audit trail in `credit_transactions`.

---

## Context — what exists today

| Area | Location | Notes |
|------|----------|-------|
| Provider pricing page | [`app/(public)/pricing/page.tsx`](app/(public)/pricing/page.tsx) | ~1100 lines — commission brackets, plan cards, perks matrix, `CommissionCalculator` |
| Get Listed page | [`app/(public)/get-listed/page.tsx`](app/(public)/get-listed/page.tsx) | Provider marketing — hero, benefits, verification tiers; **no tabs** |
| Navbar | [`components/SiteNav.tsx`](components/SiteNav.tsx) line 29 | `Pricing` → `/pricing`, `Get listed` → `/get-listed` |
| Customer wallet | [`app/customer-account/credits/page.tsx`](app/customer-account/credits/page.tsx) | Auth-required purchase; packs from `platform_config` |
| Purchase client | [`components/customer-account/CreditPurchaseClient.tsx`](components/customer-account/CreditPurchaseClient.tsx) | Pack buttons + custom amount → `/api/payments/credits/initialize` |
| Paystack initialize | [`app/api/payments/credits/initialize/route.ts`](app/api/payments/credits/initialize/route.ts) | Metadata: `credit_amount` only — no bonus |
| Paystack webhook | [`app/api/webhooks/paystack/route.ts`](app/api/webhooks/paystack/route.ts) | Calls `credit_wallet_purchase` RPC |
| Purchase RPC | [`supabase/migrations/20260702000000_credit_wallet.sql`](supabase/migrations/20260702000000_credit_wallet.sql) | `credit_wallet_purchase(p_amount)` credits wallet by `p_amount` only |
| Format helpers | [`lib/format-credits.ts`](lib/format-credits.ts) | `formatCredits()`, `formatCreditPurchase()` — no bonus breakdown |
| Credit types | [`lib/db.ts`](lib/db.ts) `CreditTransaction` | No `promotion_id` or `bonus_credits` yet |
| Config dir | — | `config/` does not exist yet |

---

## Conventions

- **Route:** Keep `/pricing` for **customers** (navbar already points here). Provider pricing lives at `/get-listed?tab=pricing`.
- **Relocation, not rewrite:** Extract provider pricing JSX into a shared component; do not rewrite copy or restructure sections.
- **Promotions:** Runtime read from `config/credit-promotions.json` via `fs.readFile` in server code (`lib/credit-promotions.ts`) — **not** a static `import` (toggling `active` must work without redeploy).
- **Bonus rounding:** Always `Math.floor(base * value / 100)` for `percentage_bonus` — no fractional credits.
- **Single active promotion:** Apply the **first** promotion in the array where `active === true`. No stacking.
- **Ledger semantics:** `amount` = base credits purchased; `bonus_credits` = bonus portion; wallet credited with `amount + bonus_credits`.

---

# PART 1: Move provider pricing to Get Listed tab

## 1. Extract provider pricing content

Create [`components/pricing/ProviderPricingContent.tsx`](components/pricing/ProviderPricingContent.tsx):

- Move the entire page body from [`app/(public)/pricing/page.tsx`](app/(public)/pricing/page.tsx) into this component (keep imports for `CommissionCalculator`, `pricing-config`, etc.).
- Export as default or named `ProviderPricingContent`.
- Leave [`CommissionCalculator.tsx`](components/pricing/CommissionCalculator.tsx) unchanged — import it from the extracted component.

The old `pricing/page.tsx` will be **replaced** in Part 2 — do not leave duplicate provider content at `/pricing`.

## 2. Add tabs to Get Listed

Refactor [`app/(public)/get-listed/page.tsx`](app/(public)/get-listed/page.tsx):

- Split current page content into an **Overview** tab (everything that exists today: hero, benefits, business types, verification tiers, CTAs).
- Add a **Pricing** tab rendering `<ProviderPricingContent />`.
- Use a client tab component, e.g. [`components/get-listed/GetListedTabs.tsx`](components/get-listed/GetListedTabs.tsx) with `useSearchParams()` for deep-linking:
  - `/get-listed` → Overview (default)
  - `/get-listed?tab=pricing` → Pricing tab
- On mount, read `?tab=pricing` and select the Pricing tab.
- Tab labels: **Overview** | **Pricing** (or match existing page tone).

## 3. Redirect old provider pricing URL

Create [`app/(public)/pricing/provider/route.ts`](app/(public)/pricing/provider/route.ts) **or** use Next.js redirect in middleware — simpler option:

Add a **temporary** redirect only if anything still links to a provider-specific path. Primary approach:

- Once Part 2 replaces `/pricing`, any bookmark to the old provider page should land on Get Listed pricing tab.
- If you need a catch-all during migration: `next.config` redirect `/pricing` is **not** viable once customer page exists.

**Instead:** After Part 2 ships, the old provider content is gone from `/pricing`. Add redirect in [`next.config.ts`](next.config.ts) or a route handler only for legacy paths if discovered (grep found no other `/pricing` links besides SiteNav).

Update [`components/SiteNav.tsx`](components/SiteNav.tsx):

| Link | New target |
|------|------------|
| `Pricing` | `/pricing` (customer credits — Part 2) |
| `Get listed` | `/get-listed` (unchanged) |

Optional: add "Provider pricing" sub-link in Get Listed hero pointing to `?tab=pricing`.

## Part 1 acceptance

- [ ] Provider pricing renders identically inside Get Listed → Pricing tab
- [ ] `/get-listed?tab=pricing` opens Pricing tab directly
- [ ] No provider commission/subscription content remains at `/pricing` after Part 2

---

# PART 2: Customer-facing credits pricing page

## Route

Replace [`app/(public)/pricing/page.tsx`](app/(public)/pricing/page.tsx) entirely with the new **customer credits** page at `/pricing`.

Public layout ([`(public)/layout.tsx`](app/(public)/layout.tsx)) already wraps `SiteNav` + `SiteFooter` — no auth required to view.

## Page sections

### Hero

Short, warm copy: credits are how customers pay for services; 1 credit = R1; buy credits, spend on any service; no subscription.

### Credit pack cards

Read pack denominations from `platform_config` via [`loadConfigStore`](lib/config-store.ts) + `CONFIG_KEYS.CREDIT_PACK_DENOMINATIONS` (same source as wallet page).

Each card shows:
- Rand paid: `Pay R{n}`
- Base credits: `{n} credits`
- Bonus (if active promotion): `+{bonus} bonus credits` and promotion name
- Total: `Get {n + bonus} credits`
- **Buy now** CTA:
  - Authenticated → `/customer-account/credits?amount={n}` (or trigger purchase flow)
  - Unauthenticated → `/sign-in?next=/customer-account/credits?amount={n}`

Reuse promotion calc from Part 3 (`lib/credit-promotions.ts`).

### Custom amount calculator

Client component below packs — input in Rands, live preview of base + bonus + total as user types. Min/max from `platform_config`. Same auth-aware Buy CTA.

Extract shared purchase preview UI where it overlaps with wallet page — e.g. [`components/credits/CreditPackCards.tsx`](components/credits/CreditPackCards.tsx) used by both `/pricing` and `/customer-account/credits`.

### How credits work

4 bullet points: buy → spend on bookings → refunded if cancelled before work begins → no expiry.

### FAQ

Implement as accordion or simple Q&A list per spec:

| Question | Answer summary |
|----------|----------------|
| Do credits expire? | No |
| Cash refund? | Non-refundable as cash; booking cancel returns credits to wallet |
| Transfer? | Non-transferable |
| Not enough credits? | Top-up prompt at booking; dashboard anytime |

Link to [`/refund`](/refund) policy for detail.

## Part 2 acceptance

- [ ] `/pricing` is customer credits page (no provider subscription content)
- [ ] Pack cards and custom calculator show live bonus when promotion active
- [ ] Buy now respects auth state
- [ ] Page matches design system (same typography/spacing as Get Listed / policy pages)

---

# PART 3: Promotion / bonus credit system

## 1. Config file

Create [`config/credit-promotions.json`](config/credit-promotions.json):

```json
{
  "promotions": [
    {
      "id": "launch-bonus-2026",
      "name": "Launch offer",
      "description": "Get 15% extra credits on every purchase",
      "type": "percentage_bonus",
      "value": 15,
      "applies_to": "all",
      "active": true
    }
  ]
}
```

Structure must allow future `type` values (`flat_bonus`, `multiplier`) and `applies_to` values (`fixed_only`, pack IDs) without breaking existing entries.

## 2. Runtime loader + calculation

Create [`lib/credit-promotions.ts`](lib/credit-promotions.ts):

```ts
export interface CreditPromotion { ... }

export function loadCreditPromotions(): CreditPromotion[]  // fs.readFileSync, parse JSON, cache with short TTL or no cache for immediate toggle
export function getActivePromotion(): CreditPromotion | null  // first active
export function calculatePurchaseCredits(baseAmount: number): {
  baseCredits: number
  bonusCredits: number
  totalCredits: number
  promotion: CreditPromotion | null
}
```

- `percentage_bonus`: `bonusCredits = Math.floor(baseAmount * value / 100)`
- `applies_to: "all"` only for now — ignore promotions with other values until implemented
- Unit tests in [`lib/domain/__tests__/credit-promotions.test.ts`](lib/domain/__tests__/credit-promotions.test.ts): R100 @ 15% → 15 bonus; R73 @ 15% → 10 bonus (floor)

## 3. Migration

Create [`supabase/migrations/20260702100000_credit_promotions.sql`](supabase/migrations/20260702100000_credit_promotions.sql):

```sql
ALTER TABLE credit_transactions
  ADD COLUMN promotion_id TEXT,
  ADD COLUMN bonus_credits INTEGER;

-- Update credit_wallet_purchase to accept bonus + promotion
CREATE OR REPLACE FUNCTION credit_wallet_purchase(
  p_customer_id TEXT,
  p_amount INTEGER,           -- base credits
  p_paystack_ref TEXT,
  p_description TEXT,
  p_bonus_credits INTEGER DEFAULT 0,
  p_promotion_id TEXT DEFAULT NULL
) ...
```

RPC changes:
- Credit wallet: `credit_balance += p_amount + COALESCE(p_bonus_credits, 0)`
- Insert ledger: `amount = p_amount`, `bonus_credits = p_bonus_credits`, `promotion_id = p_promotion_id`
- Idempotency unchanged on `paystack_ref`

Update [`lib/db.ts`](lib/db.ts) `CreditTransaction` interface.

## 4. Paystack flow updates

### Initialize route

[`app/api/payments/credits/initialize/route.ts`](app/api/payments/credits/initialize/route.ts):

- Call `calculatePurchaseCredits(amount)` server-side
- Paystack `amount` in cents = **base Rand amount × 100** (customer pays for base only; bonus is free)
- Metadata must include:
  ```json
  {
    "type": "credit_purchase",
    "customer_id": "...",
    "credit_amount": 100,
    "bonus_credits": 15,
    "promotion_id": "launch-bonus-2026"
  }
  ```

### Webhook

[`app/api/webhooks/paystack/route.ts`](app/api/webhooks/paystack/route.ts):

- Read `credit_amount`, `bonus_credits`, `promotion_id` from metadata
- Call updated `credit_wallet_purchase` with all fields
- Description example: `"Credit purchase: 100 + 15 bonus (Launch offer)"`

## 5. Purchase UI — bonus breakdown

### Before Paystack redirect (confirmation step)

Update [`CreditPurchaseClient.tsx`](components/customer-account/CreditPurchaseClient.tsx):

- On pack click or custom submit, show inline confirmation panel **before** redirect:
  - `100 credits purchased + 15 bonus credits (Launch offer)`
  - Total: `115 credits`
  - Confirm → call initialize API
- Same breakdown on public `/pricing` buy buttons

### After purchase

[`app/customer-account/credits/page.tsx`](app/customer-account/credits/page.tsx) success banner:

- When `?status=success`, show: "Payment received — 115 credits will be added (100 + 15 Launch offer bonus)" if promotion was active at purchase time (read from latest transaction once webhook completes, or show generic message until webhook lands)

### Transaction history

Enhance history table on credits page (and Account page if wallet summary links here):

| Type | Display |
|------|---------|
| Purchase | Date · Paid R{n} · {base} credits · +{bonus} bonus — {promotion name} · **{total} credits total** |
| Spend | Date · −{amount} credits · {description} · link to booking |
| Refund | Date · +{amount} credits · {description} · booking link |

Query `amount`, `bonus_credits`, `promotion_id` from `credit_transactions`. Join promotion name from config by `promotion_id` at display time (config is source of truth for names).

For purchases without promotion: `bonus_credits` is null — show simple `+{amount} credits`.

## Part 3 acceptance

- [ ] `config/credit-promotions.json` exists; setting `active: false` removes bonus without redeploy
- [ ] Bonus rounded down (R73 @ 15% = 10 bonus, 83 total)
- [ ] Webhook credits `base + bonus` once; ledger stores split
- [ ] Purchase confirmation shows base + bonus before Paystack
- [ ] Transaction history shows full purchase breakdown
- [ ] `npm test` and `npm run build` pass

---

## Implementation order

1. Create `config/credit-promotions.json` + `lib/credit-promotions.ts` + tests
2. Migration + RPC update
3. Extract `ProviderPricingContent` → Get Listed tabs + `?tab=pricing`
4. New customer `/pricing` page
5. Update Paystack initialize + webhook
6. Update `CreditPurchaseClient` + shared pack components + transaction history
7. Update SiteNav if needed

---

## Files to create

| File | Part |
|------|------|
| `config/credit-promotions.json` | 3 |
| `lib/credit-promotions.ts` | 3 |
| `lib/domain/__tests__/credit-promotions.test.ts` | 3 |
| `supabase/migrations/20260702100000_credit_promotions.sql` | 3 |
| `components/pricing/ProviderPricingContent.tsx` | 1 |
| `components/get-listed/GetListedTabs.tsx` | 1 |
| `components/credits/CreditPackCards.tsx` | 2 |
| `components/credits/CreditPricingCalculator.tsx` | 2 |

## Files to modify

| File | Change |
|------|--------|
| `app/(public)/get-listed/page.tsx` | Tab wrapper |
| `app/(public)/pricing/page.tsx` | Replace with customer credits page |
| `components/SiteNav.tsx` | Verify Pricing → customer page |
| `app/api/payments/credits/initialize/route.ts` | Bonus metadata |
| `app/api/webhooks/paystack/route.ts` | Bonus RPC args |
| `components/customer-account/CreditPurchaseClient.tsx` | Confirmation + bonus display |
| `app/customer-account/credits/page.tsx` | Richer transaction history |
| `lib/format-credits.ts` | Optional: `formatCreditPurchaseWithBonus()` |
| `lib/db.ts` | `promotion_id`, `bonus_credits` on `CreditTransaction` |

---

## Out of scope

- Multiple simultaneous promotions stacking
- Promotion eligibility rules (first purchase only, segments)
- Admin UI for promotions
- Changing provider subscription pricing logic

---

## Reference

- Credit system prompt: [`2026-07-02-credit-system-policy-pages-prompt.md`](2026-07-02-credit-system-policy-pages-prompt.md)
- Provider pricing source: [`lib/pricing-config.ts`](lib/pricing-config.ts)
- Refund policy (FAQ link): [`app/(public)/refund/page.tsx`](app/(public)/refund/page.tsx)
