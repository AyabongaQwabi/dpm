# Claude Code prompt — Embeddable widgets: services, profile card, reviews (ServicePros / DPM engine)

Repository: `/Users/nonwork/dev/servicepros/dpm`
Stack: Next.js (App Router) + TypeScript, Supabase (DB / Auth / Storage), Tailwind, Yoco, pnpm, Vitest.

## Why this exists, and the one rule that governs everything in it

These widgets let a provider put ServicePros on their own website. The rule that makes this different from a lead-capture form: **every widget must carry the real, on-platform booking flow through to completion — payment, messaging, review and commission all stay on ServicePros.** Nothing in this build creates a lead form, a "request a callback," or any path that ends in an off-platform phone call or WhatsApp message as the primary conversion. If a mode can't end in an actual booking, it doesn't ship in this pass.

Depends on Prompt 01 (funnel events) and, ideally, Prompt 03 (provider analytics) for surfacing widget performance back to the provider — confirm both in Step 0.

---

## STEP 0 — READ THE CODEBASE FIRST. WRITE NOTHING YET.

1. **Booking flow entry points.** Every existing way a booking can be started today (service page, search result, anywhere else), and whether any of them already support being opened in a constrained/modal context vs. requiring a full page navigation. This determines whether the widget's "Book" click can open an in-page modal or must redirect to servicepros.co.za.
2. **Auth in a cross-origin context.** How customer auth/session currently works, and whether it can function inside an iframe on a third-party domain (cookie settings, `SameSite`, any existing CSP). This is the hardest technical constraint in this build — report honestly if third-party cookies will block a logged-in customer from booking inside an embedded iframe, since that may force the "Book" action to open a new tab to servicepros.co.za rather than complete inside the iframe.
3. **Reviews.** Existing review display component, to reuse for the reviews-mode widget, and reconfirm the gating rule (completed booking only) is enforced at the query level, not just the UI level.
4. **Provider public profile data.** What's already fetchable via a public (unauthenticated) endpoint vs. what requires auth — badges, rating, services, price.
5. **CSP/CORS.** Any existing Content-Security-Policy or CORS configuration that a script-embed or iframe-embed approach needs to work within or extend.
6. **Subscription status.** How to check "is this provider's subscription currently active" server-side, since the widget should lapse with the subscription.
7. **`funnel_events`.** Confirm from Prompt 01 that this exists and can accept a `source: 'embed'`, `origin_domain` tag.

Then stop and wait for my go-ahead. **In particular, tell me your recommendation on iframe-modal-booking vs. new-tab-to-servicepros before writing any widget code** — this decides the entire architecture of Part 2.

---

## Ground rules

- No commission special-casing invented in this build. Whether embed-originated bookings get a reduced commission bracket as a ceiling-package perk is a pricing decision, not an engineering one — read the rate from config exactly like any other booking; do not add "if source == embed" logic to the commission calculation unless a specific `embed_commission_discount_bps` config value (default 0, `TODO(aya): confirm`) is what drives it. Zero means no special treatment until confirmed.
- The widget only renders for providers with an active subscription. It stops rendering (or renders a "temporarily unavailable" state, not a broken widget) if the subscription lapses.
- Rate-limit widget interactions per `origin_domain` to prevent abuse; a widget embedded on an unrelated or spam domain should not be able to hammer the booking endpoints.
- No new browser storage APIs beyond what's already used elsewhere in the app (no localStorage assumptions that break under third-party cookie restrictions — this connects directly to the Step 0 auth finding).
- After each part: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

---

## PART 1 — Shared embed runtime

A single script (`/embed/v1.js`) that reads `data-provider`, `data-mode` (`services` | `card` | `reviews`), `data-accent`, `data-radius` from its script tag and renders the appropriate widget into a container. Iframe fallback for platforms that can't run a script tag (Wix/Squarespace/WordPress) — same three modes, configured via iframe `src` query params instead of data attributes.

Log a `funnel_events` row (`source: 'embed'`, `origin_domain` from `document.referrer` or the iframe parent, `mode`) on load and on any meaningful interaction (Book click, review-widget click-through).

## PART 2 — `mode="services"` (build this one properly; it's the point)

Renders the provider's live bookable services (name, price, short description) with a Book button per service. On click: per your Step 0 recommendation, either opens the real booking flow in a modal within the iframe (if auth will actually work there) or opens servicepros.co.za in a new tab, pre-selected to that provider and service, carrying `source=embed&origin_domain=...` through to the booking creation so it's attributable in `funnel_events` and, later, in provider analytics (Prompt 03).

Whichever path Step 0 leads to, the customer must end up completing the **exact same booking flow** — credit top-up, payment, messaging, in-progress, completion, gated review — as any other booking. No parallel or simplified booking path gets built for the embed.

## PART 3 — `mode="card"` and oEmbed

Compact profile card: badges, rating, city, service count, a link/button through to the profile (which itself contains the real booking flow). Add a standard `oEmbed` JSON endpoint (`/oembed?url=...`) so pasting a ServicePros profile URL into any oEmbed-consuming tool (Notion, WordPress, Slack) renders this same card automatically, no script tag required.

## PART 4 — `mode="reviews"`

Scrolling list of verified-booking reviews (reuse the existing review component/query from Step 0, enforcing the same completion-gated query — do not build a second, looser review query for this). Small always-visible live rating badge variant for tight spaces, linking back to the profile.

## PART 5 — Dashboard generator

In the provider dashboard: pick a mode, preview it live, get the copy-paste script tag or iframe snippet, with basic install instructions for WordPress/Wix/Squarespace. Surface (reusing Prompt 03's analytics if it's landed, otherwise a minimal version here) widget loads and Book-clicks per `origin_domain` so a provider can see whether their installed widget is doing anything — an unmeasured widget is one that gets removed at the next site redesign.

---

## Report back

Confirm typecheck/lint/test pass. Restate your Step 0 recommendation on the auth/iframe architecture and confirm Part 2 was built accordingly. Confirm no commission logic branches on `source` unless `embed_commission_discount_bps` is non-zero in config. List every new config key and its default.