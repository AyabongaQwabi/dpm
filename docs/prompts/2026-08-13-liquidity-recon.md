# Claude Code prompt — Liquidity instrumentation, split satisfaction tracking, leakage measurement (ServicePros / DPM engine)

Repository: `/Users/nonwork/dev/servicepros/dpm`
Stack: Next.js (App Router) + TypeScript, Supabase (DB / Auth / Storage), Tailwind, Resend, Yoco, pnpm, Vitest.

This is the first of a series of prompts. It ships no customer-facing feature — it builds the measurement layer everything else in the series will be judged against. Do not skip it or reorder it after later prompts.

---

## STEP 0 — READ THE CODEBASE FIRST. WRITE NOTHING YET.

Report back before writing anything. Do not guess, do not infer from file or table names. Where this prompt describes something that already exists in a different shape, the codebase wins — flag it and stop.

Report on:

1. **Bookings.** The full table(s) backing a booking — status vocabulary, timestamps present (created, paid, in_progress, completed, cancelled), foreign keys to provider, service, customer. Is there already a `source` or `origin` field on bookings? Is there anything distinguishing an embed-originated booking from an on-site one?
2. **Services.** How a bookable service is modelled — table, price field, whether price is a fixed value, a range, or "quote required" is representable today.
3. **Messaging and reviews.** Existing tables for booking messages and for reviews, and exactly what "gated to completed booking" looks like in the schema today (a foreign key from review to booking? a status check?).
4. **Profile/search views.** How profile views and search appearances are currently tracked, if at all. Is there an existing analytics or events table?
5. **Geography.** How city/location is stored on providers — free text, foreign key to a cities table, lat/lng. Is there a canonical list of cities the platform recognises, and does the homepage tile logic query it directly or from a cached/config source?
6. **Categories.** How category-provider counts are computed for the homepage and browse grid today — live query or cached/materialised.
7. **Config.** Where platform-wide config values already live (`platform_config` table, JSON file, or similar) so new thresholds join the existing pattern rather than starting a second one.
8. **Cron/scheduled jobs.** What mechanism (if any) exists for nightly or periodic jobs — Vercel Cron, Supabase Edge Function schedule, or none yet.

Then stop and wait for my go-ahead before Part 1.

---

## Ground rules

- No invented commercial values or thresholds. Every number (liquid-cell thresholds, minimum sample sizes, response-time windows) goes in config with `TODO(aya): confirm` next to a clearly marked suggested default.
- Every new table gets RLS. Every policy gets a test.
- Migrations are additive and idempotent. Never drop or alter an existing column without flagging it first.
- This build is internal-facing only (admin dashboard). Nothing here changes what a customer or provider sees.
- Money is integers, matching whatever convention already exists.
- After each Part: `pnpm typecheck`, `pnpm lint`, `pnpm test`, then report before moving on.

---

## PART 1 — Funnel events

Add lightweight event logging for the funnel: `search_performed`, `service_viewed`, `booking_started`, `booking_paid`, `booking_completed`, `review_submitted`. Each event carries category, city (resolved, not free text), provider_id where applicable, and a session/anonymous id for pre-auth events. Reuse an existing events/analytics table if Step 0 found one; otherwise create `funnel_events` with RLS restricting read access to admin roles only.

Do not log PII beyond what's already captured elsewhere (no raw IP, no full name in the event row).

## PART 2 — Liquid-cell definition and the internal dashboard

Add config-driven thresholds (suggested defaults, all `TODO(aya): confirm`):
- `min_providers_per_cell` (suggested 8)
- `min_response_rate_24h` (suggested 0.80)
- `min_completed_bookings_30d` (suggested 1)

Build a single internal-only page (behind existing admin auth) showing, per category × city:
- provider count (claimed, bookable)
- % of bookings with provider first response within 24h, and median response time
- funnel counts from Part 1, with conversion rates at each step
- a computed "liquid" / "not liquid" flag against the config thresholds

Sort by category, filterable by city. No design polish needed — this is an operating tool, not a customer surface.

## PART 3 — Split satisfaction tracking

Two independent survey flows, never blended in any report:
- **Customer NPS**, triggered once at booking completion (reuse the existing completion trigger point that fires the review prompt, if there is one — ask, don't assume, if unclear).
- **Provider NPS**, triggered at day 30 post-claim and then quarterly.

Store in `satisfaction_responses`: `side` ('customer'|'provider'), `score`, `verbatim`, `category`, `city`, `booking_id` (nullable for provider-side), `created_at`. Add to the internal dashboard as two separate figures, side by side, never averaged together.

## PART 4 — Leakage measurement

Add a query (or materialised view) counting: services viewed with no booking started in the following 30 days; bookings started but never paid. Surface both as rates in the dashboard, sliced by category and city.

Add a manual-trigger (not automatic) CSV export of a random sample of "viewed, never booked" cases with contact details, for a human to survey by phone/WhatsApp about whether the job happened off-platform. This is a research tool, not an automated outreach system — do not send anything automatically.

---

## Report back

After all four parts: confirm typecheck/lint/test pass, list every new table/column/config key with its `TODO(aya): confirm` defaults collected in one place, and flag anything in Step 0 that changed the shape of what you built.