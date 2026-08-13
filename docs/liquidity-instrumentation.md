# Liquidity instrumentation

Internal measurement layer for the marketplace: funnel events, a per-category×city
"liquid cell" rollup, split customer/provider NPS tracking, and leakage measurement.
Nothing here changes what a customer or provider sees, except two new surfaces
required for the flows to actually work end-to-end: the `/nps/[token]` survey page
and the `/api/nps/submit` + `/api/funnel-events` routes. No admin dashboard page is
included — this is the data layer a future dashboard prompt will read from.

## Why this exists

Before any product decision gets made about liquidity, satisfaction, or leakage,
there needs to be a trustworthy, admin-only record of what's actually happening —
not a UI change riding on assumptions about it. This build is that record.

## What was built, part by part

### Part 1 — Funnel events

- **`funnel_events`** table (`supabase/migrations/20260820000000_funnel_events.sql`):
  pre-booking funnel steps only — `search_performed`, `service_viewed`,
  `review_submitted`. Booking-lifecycle steps (`booking_started`, `booking_paid`,
  `booking_completed`) are deliberately **not** duplicated here — they're read live
  from the existing `booking_status_history` / `booking_events` view at query time.
- **`bookings.source`** / **`bookings.origin_domain`** columns added in the same
  migration, ahead of a future embeds prompt that will populate them. Every booking
  today lands with `source = 'site'`.
- Logging: `lib/liquidity/log-funnel-event.ts` (server-only insert), a client
  tracker component `components/analytics/FunnelEventTracker.tsx` (mirrors the
  existing `ProviderAnalyticsTracker` — same `sessionStorage`-backed anonymous
  session id, same `sendBeacon`-first dispatch, no new browser storage API), and
  `app/api/funnel-events/route.ts` for the client to POST to.
- Wired into: `app/(public)/search/page.tsx` (`search_performed`),
  `app/(public)/services/[id]/page.tsx` (`service_viewed`), and
  `lib/actions/customer.ts`'s `submitReview` (`review_submitted`).
- Access: RLS enabled, all `anon`/`authenticated` access revoked. Reads/writes are
  service-role only, same model as the pre-existing `provider_analytics_events`.

### Part 2 — Liquid-cell rollup

- **`liquidity_cell_snapshots`** table
  (`supabase/migrations/20260821000000_liquidity_cell_snapshots.sql`): one row per
  (category, city) per nightly run. Historical, not upserted in place, so a future
  dashboard can chart a trend.
- **`lib/domain/liquidity.ts`**: pure classification logic — `isLiquidCell`,
  `earliestProviderResponse`, `respondedWithin24h`, `responseMinutes`, `median`. No
  DB imports.
- **`lib/liquidity/cell-stats.ts`**: the signal-assembly layer (same role
  `lib/search.ts` plays for `lib/domain/ranking.ts`). Computes per cell: claimed
  provider count, completed bookings (30d), 24h provider-response rate + median
  response minutes, and funnel counts.
  - Response time is computed by **unioning `booking_messages` and
    `messages`/`message_threads`** (via `message_threads.booking_id`) — earliest
    provider-authored message wins across either system.
  - `booking_started` is read as `booking_status_history.to_status = 'requested'`
    transitions; `booking_paid` has no independent timestamp in this schema
    (payment is a credit-wallet spend set atomically at booking creation via
    `create_booking_with_credit_spend`), so it is not tracked as a separate step.
- **`app/api/cron/liquidity-rollup/route.ts`**: nightly job (`vercel.json`,
  `0 4 * * *`), `CRON_SECRET`-gated like the existing cron jobs, writes one
  snapshot row per cell.
- **Config** — `config/liquidity.json` / `lib/liquidity-config.ts`, all
  `TODO(aya): confirm`:
  - `liquidCell.minProvidersPerCell` — suggested 8
  - `liquidCell.minResponseRate24h` — suggested 0.80
  - `liquidCell.minCompletedBookings30d` — suggested 1
  - `leakage.windowDays` — suggested 30
  - `leakage.csvSampleSize` — suggested 50

### Part 3 — Split satisfaction tracking (NPS)

- **`nps_survey_queue`** and **`satisfaction_responses`** tables
  (`supabase/migrations/20260822000000_satisfaction_responses.sql`). `side` is
  CHECK-constrained to `customer|provider` on both tables — every read must filter
  on `side`; the two are never blended. `score` is CHECK-constrained to 0–10. A
  partial unique index on `satisfaction_responses.survey_id` guarantees one
  response per survey send.
- **Not folded into the existing `nurture_email_queue`**: that table's config
  (`lib/nurture-emails-config.ts`) keys exactly one sequence per audience
  (`'provider'`/`'customer'`), which would collide with the existing onboarding
  sequences. `nps_survey_queue` is a small, separate queue with the same
  scheduling/idempotency/retry shape.
- **Customer trigger**: `enqueueCustomerNps` (`lib/actions/nps.ts`), hooked into
  `transitionBooking`'s `if (to === 'completed')` block
  (`lib/actions/booking-transitions.ts`) — the single choke point every path to
  `completed` passes through (customer confirm, the currently-disabled
  auto-complete cron, and any future system transition). Idempotent per booking.
- **Provider trigger**: `enqueueDueProviderNps` — first survey at day 30 post-claim
  (`profile_claims.verified_at` when a verified claim exists, else
  `providers.created_at` for direct signups), then every `quarterlyIntervalDays`
  after that, cycle-indexed for idempotency.
- **Delivery**: `app/api/cron/nps-surveys/route.ts` (new cron, `0 9 * * *`) enqueues
  due provider surveys and sends anything due in the queue.
- **Submission**: `app/api/nps/submit/route.ts` (public POST, keyed by
  `survey_token` — no auth required, since the recipient may click the email link
  from anywhere) plus a minimal public survey page at `app/(public)/nps/[token]/page.tsx`
  (0–10 score buttons + optional comment, no branding polish).
- **Config** — `config/satisfaction.json` / `lib/satisfaction-config.ts`, all
  `TODO(aya): confirm`:
  - `customer.delayHours` — suggested 24 (offset from the immediate review-prompt email)
  - `provider.firstSurveyDays` — suggested 30
  - `provider.quarterlyIntervalDays` — suggested 90

### Part 4 — Leakage measurement

- **`lib/liquidity/leakage.ts`**: `computeViewedNeverBookedRates`,
  `computeStartedNeverPaidRates`, `computeLeakageRates` — aggregate rates by
  category×city, windowed by `LEAKAGE_WINDOW_DAYS`.
- **CSV export**: `sampleLeakageForExport` + pure `toCsv`
  (`lib/domain/liquidity.ts`) — a random sample (Fisher-Yates), capped by
  `LEAKAGE_CSV_SAMPLE_SIZE`. **Manual-trigger only — no route or cron calls this.**
  It returns rows; it never sends anything.
- **Scope limit, by design, not oversight**: the CSV only covers "booking started,
  never paid." `funnel_events.service_viewed` carries no link to a real,
  contactable person (`session_id` is an anonymous pre-auth id, and the service
  page never resolves customer identity even when the visitor is logged in), so
  "viewed, never booked" is aggregate-rate-only. Extending `service_viewed` to
  capture identity is a separate, privacy-relevant scope decision — not made here.

## Data-model notes worth knowing before extending this

- **`booking_started` and `booking_paid` are the same instant today.** There's no
  live per-booking payment step in this schema — booking payment is a credit-wallet
  spend, set unconditionally inside the same `INSERT` that creates the booking row.
  If a future payment method changes this, `computeStartedNeverPaidRates` in
  `lib/liquidity/leakage.ts` is already written against `payment_status`, so it
  starts finding real cases the moment that changes — no rework needed there.
- **Review gating is RLS-only.** `reviews`' completed-booking gate is a
  `WITH CHECK` INSERT policy, which does not cover service-role writes. Any future
  job that inserts reviews via the admin client must re-check
  `booking.status = 'completed'` in code.
- **`getCategories()` in `lib/public-data.ts`** is missing the `is_published`
  filter that its sibling `getLocations()` has on the joined providers — a
  pre-existing inconsistency, flagged but not fixed here (out of scope for an
  instrumentation build; worth its own one-line commit).

## How to test this

### Automated

```bash
pnpm typecheck   # tsc --noEmit — this repo has no `typecheck` script, run tsc directly:
npx tsc --noEmit
pnpm lint
pnpm test
```

All new logic is covered by two kinds of test, matching this repo's existing
conventions:

- **Pure-logic tests** (`lib/domain/__tests__/liquidity.test.ts`,
  `lib/domain/__tests__/liquidity-csv.test.ts`) — exercise
  `lib/domain/liquidity.ts` directly (`isLiquidCell`, response-time math, `median`,
  CSV formatting/escaping). No DB, no mocking.
- **Architecture tests** (`lib/__tests__/funnel-events-architecture.test.ts`,
  `lib/__tests__/liquidity-cell-snapshots-architecture.test.ts`,
  `lib/__tests__/satisfaction-responses-architecture.test.ts`) — static assertions
  against the migration SQL text: RLS is enabled, no anon/authenticated policy
  exists, no `DROP COLUMN`/`DROP TABLE`, no accidental coupling to
  `provider_analytics_events` or `nurture_email_queue`. This matches the pattern
  already used for the booking-lifecycle migration
  (`lib/__tests__/booking-lifecycle-architecture.test.ts`) — there's no live
  Postgres test harness in this repo, so migrations are tested as text.

### Manual, once the migrations are applied to a real Supabase project

1. **Funnel events**
   - Visit `/search?q=plumber`, then a service detail page. Confirm rows land in
     `funnel_events` with `event_type` = `search_performed` / `service_viewed` and
     a non-null `category`/`city` where applicable — check via the Supabase table
     editor or `select * from funnel_events order by created_at desc limit 10;`
     (service-role key required — RLS blocks anon/authenticated reads by design).
   - Submit a review from `/customer-account/reviews` on a completed booking.
     Confirm a `review_submitted` row appears.

2. **Liquid-cell rollup**
   - `curl -H "Authorization: Bearer $CRON_SECRET" https://<deploy>/api/cron/liquidity-rollup`
   - Confirm it returns `{"cellsWritten": N}` and that `liquidity_cell_snapshots`
     has N new rows with a fresh `computed_at`.
   - Spot-check one row's `is_liquid` against the three thresholds in
     `config/liquidity.json` by hand.

3. **Customer NPS**
   - Complete a booking end-to-end (or call `confirmCompletion` on a test booking).
   - Confirm a `nps_survey_queue` row appears with `side = 'customer'`,
     `booking_id` set, `scheduled_for` ~24h out (per `customer.delayHours`).
   - To test delivery without waiting: manually update that row's
     `scheduled_for` to the past, then
     `curl -H "Authorization: Bearer $CRON_SECRET" https://<deploy>/api/cron/nps-surveys`
     and confirm the email sends (or, without `RESEND_API_KEY` set locally, confirm
     the console warning "email not sent" and that `status` still moves off
     `queued`).
   - Open the emailed (or queried) `survey_token` at `/nps/<token>`, submit a score,
     confirm a `satisfaction_responses` row lands with `side = 'customer'` and the
     resolved `category`/`city`. Reloading the same link should show "already
     answered," not a second form.

4. **Provider NPS**
   - Pick a test provider whose `claim_status = 'claimed'` and whose
     `providers.created_at` (or `profile_claims.verified_at`, if claimed via that
     flow) is more than `provider.firstSurveyDays` in the past.
   - Run the `/api/cron/nps-surveys` job and confirm a `side = 'provider'`
     `nps_survey_queue` row appears with `booking_id = null`.
   - Run the job again immediately — confirm no duplicate row (idempotency key is
     cycle-indexed).

5. **Leakage (manual, code-level only — no route wired to it yet)**
   - From a script or REPL with admin access:
     ```ts
     import { computeLeakageRates, sampleLeakageForExport, toCsv } from '@/lib/liquidity/leakage'
     const rates = await computeLeakageRates()
     const sample = await sampleLeakageForExport(10)
     console.log(toCsv(sample))
     ```
   - Confirm `rates` has one row per (category, city) with plausible-looking
     `viewedNeverBookedRate`/`neverPaidRate` values (0 is expected for
     `neverPaidRate` today — see the data-model note above).

### What's intentionally not testable yet

There's no dashboard page reading `liquidity_cell_snapshots`,
`satisfaction_responses`, or the leakage functions — this pass is the data layer
only. "Does the dashboard show the right liquid/not-liquid flag" isn't a
answerable question until that page exists.
