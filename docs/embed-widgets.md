# Embeddable widgets (services, profile card, reviews)

Lets a provider put a live ServicePros widget on their own website. Built in five
parts against `docs/prompts/2026-08-13-embeds-recon.md`, after a Step 0
investigation that decided the architecture before any widget code was written.

## Why this exists

Providers want ServicePros visible on their own site, but a plain lead-capture
form ("request a callback") would let bookings happen off-platform — no payment,
no messaging, no review, no commission. The one rule that governs this build:
**every widget must carry the real, on-platform booking flow through to
completion.** Nothing here creates a parallel or simplified booking path.

## The architecture decision, and why

Step 0 found a double blocker to a same-page iframe booking experience:

1. `next.config.ts` sets `X-Frame-Options: SAMEORIGIN` globally
   (`source: '/(.*)'`). This blocks the ServicePros site from being framed on
   any third-party domain, full stop — before auth is even relevant.
2. Supabase auth cookies use `@supabase/ssr` defaults (effectively
   `SameSite=Lax`, no custom cookie domain). Even if framing were allowed, a
   logged-in customer's session cookie would not be sent on requests from
   inside a cross-origin iframe.

Loosening either one alone doesn't fix the other, and relaxing `X-Frame-Options`
was explicitly ruled out as a deliberate, separate decision this pass doesn't
make. So the widget never attempts in-iframe auth or booking:

- The widget itself (script tag) renders only public, unauthenticated data.
- Every Book / quote / profile link opens `servicepros.co.za` in a **new top-level
  tab**, carrying `?source=embed&originDomain=<hostname>` through to checkout.
- That new tab is the real, first-party ServicePros site — real cookies, real
  session, the exact same checkout flow (credit top-up, payment, messaging,
  completion, gated review) as any other booking. No iframe involved at any
  point in the booking path.
- The iframe *fallback* described in the original prompt (for platforms that
  can't run a script tag) was dropped for the same reason: a new `/embed/...`
  page would still inherit the global `X-Frame-Options` header, so it can't be
  framed either. Script-tag-only this pass.

## What was built, part by part

### Part 1 — Shared embed runtime

- **`app/embed/v1.js/route.ts`**: serves a single JS file. Reads
  `data-provider`, `data-mode` (`services` | `card` | `reviews`), `data-variant`
  (`badge`, reviews-only), `data-accent`, `data-radius` off its own `<script>`
  tag, fetches `/api/embed/[providerId]/data`, and renders into a container
  inserted right after the script tag. No dependencies, no build step — plain
  DOM APIs so it can run on any host page.
- Logs `funnel_events` rows (`embed_view` on load, `embed_interaction` on any
  Book/quote/profile/reviews click) tagged with `origin_domain` from
  `window.location.hostname`.

### Part 2 — `mode="services"`

- **`app/api/embed/[providerId]/data/route.ts`**: public, unauthenticated,
  CORS-wildcard JSON endpoint. Gated on `providers.is_published` and
  `provider_subscriptions.status = 'active'` — the widget stops rendering (or
  shows "temporarily unavailable") if the subscription lapses.
- Rate-limited per `(origin_domain, provider_id)` using a bounded `LIMIT`
  scan (not `count: exact`) against `funnel_events`, so a popular widget can't
  make the rate-limit check itself the bottleneck.
- Each service renders one of three ways, matching the same branches used on
  the public listing card and `PackageSelector`: priced (`priceFrom` + "Book"),
  quote-only (`acceptsCustomQuotes` + "Get a custom quote", no price shown),
  or neither ("Not currently bookable", no CTA).
- `bookings.source` / `bookings.origin_domain` (already added to the schema
  ahead of this prompt) are now actually populated: captured server-side at
  each hop — `services/[id]/page.tsx` reads them from its own `searchParams`,
  `PackageSelector` threads them into the `/checkout` link and the `/sign-in`
  redirect (so they survive a not-yet-authenticated customer logging in),
  `checkout/page.tsx`'s server action re-reads them from hidden form fields,
  and `createBookingWithCredits` passes them to the
  `create_booking_with_credit_spend` RPC, which now writes them onto the
  `bookings` insert.
- No commission special-casing: `EMBED_COMMISSION_DISCOUNT_BPS` exists in
  `config/embed.json` at `0` (`TODO(aya): confirm`) but nothing reads or
  branches on it. Embed-originated bookings get standard commission.

### Part 3 — `mode="card"` and oEmbed

- `mode="card"` renders badges/rating/city/service-count with a link to the
  full profile (already covered by Part 1's runtime).
- **`app/oembed/route.ts`**: `GET /oembed?url=<profile-url>`. Not a new
  rendering path — the returned `html` field is the same script-tag snippet a
  provider would hand-paste (`<script src=".../embed/v1.js" data-mode="card"
  ...>`), so any oEmbed consumer that executes returned HTML directly (Notion,
  WordPress) runs the widget exactly like a manual embed. A consumer that
  sandboxes the HTML in its own iframe is a choice on their end.
- `<link rel="alternate" type="application/json+oembed">` added to the
  provider profile page's `generateMetadata` for URL-paste auto-discovery.
- Reuses the same CORS/cache posture as the data endpoint — no new config.

### Part 4 — `mode="reviews"`

- Reuses the exact same `providers → reviews` query relation the public
  profile page and service page already use — not a second, looser query.
  Confirmed no caller in the codebase (including this one) filters
  `reviews.status` (`published`/`hidden`/`flagged`); the widget faithfully
  matches that existing behavior rather than diverging from it. Flagged as a
  pre-existing gap, not fixed here.
- The completed-booking gate is enforced at write time
  (`lib/domain/reviews.ts:canWriteReview`), backed by `reviews.booking_id`
  being a mandatory unique FK — the widget inherits that guarantee by reading
  through the same table/relation, same as every other display surface.
- `data-variant="badge"` on `data-mode="reviews"` gives the small
  always-visible rating badge for tight spaces; default variant is the
  scrolling list. `reviews.maxItems` (20, `config/embed.json`) caps payload
  size only — no sort/filter toggle, no way for a provider to control which
  reviews show.

### Part 5 — Dashboard generator

- **`app/provider-dashboard/widgets/page.tsx`** +
  **`components/provider-dashboard/WidgetGenerator.tsx`**: mode picker, live
  preview (injects the real `/embed/v1.js` script into the dashboard page
  itself — first-party, no iframe), copy-paste snippet, install notes for
  WordPress/Wix/Squarespace (script-tag insertion only; explicitly states the
  widget is not iframe-compatible).
- Gated on `provider_subscriptions.status = 'active'` — same base-plan check
  as the widget's own rendering, **not** Pro/entitlement-gated. The widget is
  meant to be a broadly available acquisition tool.
- Shows a minimal "last 7 days: N loads, N clicks, by site" block sourced
  directly from `funnel_events`, visible to everyone with an active
  subscription — deliberately *not* folded into the Pro-gated Prompt-03
  analytics dashboard (`ENTITLEMENT_KEYS.ANALYTICS`). Rationale: "is the
  widget I installed doing anything" is basic operational feedback for an
  acquisition tool, not the kind of premium peer-comparison insight Prompt 03
  gates.

## New config: `config/embed.json`

Documented in `config/README.md`. Keys: `modes` (valid `data-mode` values),
`rateLimit.maxRequestsPerWindow` / `.windowMinutes` (60 / 5 — per
origin_domain+provider), `commission.embedCommissionDiscountBps` (`0`,
unconfirmed — no code branches on it), `cache.widgetDataMaxAgeSeconds` (300),
`reviews.maxItems` (20).

## Schema changes

- `supabase/migrations/20260825000000_embed_widgets.sql`: adds
  `funnel_events.origin_domain`, extends `funnel_events.event_type` with
  `embed_view` / `embed_interaction`.
- `supabase/migrations/20260825000001_booking_source_rpc.sql`: extends
  `create_booking_with_credit_spend` with `p_source` / `p_origin_domain`
  (defaulted, backward compatible) so the RPC actually writes the
  `bookings.source` / `origin_domain` columns that a prior migration added
  ahead of this work.

## How to test

### 1. Apply migrations

```bash
supabase db push
```

### 2. Widget data endpoint

Pick a published provider id with an active subscription:

```bash
curl "http://localhost:3000/api/embed/<providerId>/data?mode=services"
curl "http://localhost:3000/api/embed/<providerId>/data?mode=card"
curl "http://localhost:3000/api/embed/<providerId>/data?mode=reviews"
```

Expect `provider` always present; `services`/`reviews` present only for the
matching `mode`. Set the provider's subscription to `expired` in
`provider_subscriptions` and re-request — expect
`{ "error": "unavailable", "reason": "subscription_inactive" }`, not a crash.

Confirm CORS: response should include `Access-Control-Allow-Origin: *`.

Confirm rate limiting: hit the same URL with `&originDomain=test.example.com`
more than `rateLimit.maxRequestsPerWindow` (60) times inside
`rateLimit.windowMinutes` (5) — expect a `429` once the cap is crossed. (The
per-request cost should stay flat as you do this — that was the point of the
bounded-`LIMIT` fix.)

### 3. Script-tag widget, standalone

Create a static HTML file anywhere outside the repo (simulating a third-party
site) with:

```html
<div><script src="http://localhost:3000/embed/v1.js" data-provider="<providerId>" data-mode="services" async></script></div>
```

Open it directly in a browser (`file://` or any static server). Confirm:
services render with correct price-or-quote branching, "Book" opens a new tab
to `/services/<id>?source=embed&originDomain=...`, and completing that booking
in the new tab lands a `bookings` row with `source = 'embed'` and
`origin_domain` set to the test page's host.

Repeat with `data-mode="card"`, `data-mode="reviews"`, and
`data-mode="reviews" data-variant="badge"`.

### 4. oEmbed

```bash
curl "http://localhost:3000/oembed?url=$(python3 -c "import urllib.parse;print(urllib.parse.quote('https://servicepros.co.za/providers/<slug>'))")"
```

Expect `type: "rich"`, an `html` field containing a `<script src=".../embed/v1.js" data-mode="card">` tag, and `provider_name: "ServicePros"`. Also
view-source the provider profile page and confirm a
`<link rel="alternate" type="application/json+oembed" href="...">` tag is
present in `<head>`.

### 5. Dashboard generator

Sign in as a provider with an active subscription, visit
`/provider-dashboard/widgets`. Confirm: mode picker updates the live preview
in place (no iframe — inspect the DOM, it's a real injected `<script>` tag),
the copy button copies a snippet matching the picker state, and the "last 7
days" stats block shows zero state before any embed traffic and updates after
generating some via steps 2–3 above. Then set the provider's subscription to
inactive and reload — expect the "renew to use widgets" message, not the
generator.

### 6. Regression

```bash
npx tsc --noEmit
pnpm lint
pnpm test
```

All three should be clean/passing — this was verified after every part during
the build.
