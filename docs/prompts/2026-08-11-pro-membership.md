# Claude Code prompt — Pro membership badge & sponsored inventory

**Repo:** `/Users/nonwork/dev/servicepros/dpm`
**Scope:** three batches, in order. Do not start a batch until the previous one is reviewed and approved.

- **Batch A** — Pro membership badge: entitlement model, purchase, display
- **Batch B** — Pro feature unlocks driven by entitlements
- **Batch C** — sponsored and featured inventory

This is a large change. Work batch by batch. Stop between batches and report.

---

## The two rules that govern everything here

**1. Pro is not verification.** ServicePros already has four evidence-based verification badges — Contact, Google, CIPC, FICA — documented at `/verification`. Pro is a paid membership. It proves nothing about the provider except that they paid. It must never share the verification badges' name, colour, shape, tooltip language, sort logic or data model. If Pro ends up looking like a fifth verification tier, the change has failed.

**2. Sponsored placement is bought time, never bought leads.** ServicePros providers do not pay to compete for leads. Sponsored slots are sold as flat-rate, time-boxed placements. Nothing in this build may charge per lead, per click-to-contact, per quote request, or by auction.

---

## Step 0 — Read before writing anything

Report on all of these before writing code:

1. **Verification model** — how the four badges are stored, computed and rendered. Find the component that renders a badge, the logic that picks "strongest badge", and where the tooltip copy lives.
2. **Package and pricing config** — where the R99 base, the five packages, the commission brackets and the ceiling rates are defined. Confirm they are config, not hardcoded. Every rand amount in this build must be read from the same place.
3. **Credits / wallet** — the credit-based wallet system (1 credit = R1) and how top-ups flow into it. **The payment provider is Yoco, not Paystack.** Report which provider the code actually integrates with, and flag any leftover Paystack references, env vars, webhooks or dead code you find — a later migration back to Paystack is planned, so note anything that would make that switch harder. Note exactly how an existing charge is debited.
4. **Subscription state** — how a provider's active package, billing period and lapse/reactivation are modelled.
5. **Featured strip** — the homepage "Businesses worth a closer look" section. How are those providers currently selected? Handpicked list, flag on a row, query? Report the exact mechanism.
6. **Sponsored providers** — search the codebase and any spec files for existing sponsored-provider work. There is a prior specification describing sponsored providers appearing in floating boxes site-wide, granted free to providers with no sales at 2 and 3 months. Report whether any of it is built.
7. **Search and category pages** — how the provider list is ordered on `/search`, `/providers/category/*` and `/providers/in/*`.

If anything below contradicts what you find, follow the repo and tell me.

---

# Batch A — Pro membership badge

## A.1 Entitlement model

Do not add a boolean `is_pro` column. Build an entitlements layer, because Batch B and future tiers depend on it.

- `pro_memberships` — provider_id, status (`active`, `lapsed`, `cancelled`), source (`purchased`, `package_included`, `granted`), started_at, current_period_end, cancelled_at, notes.
- Entitlements themselves belong in **config**, not the database: a single map from entitlement key → which sources grant it. Batch B reads only from this map.
- A single server-side helper — `hasEntitlement(providerId, key)` or similar — is the only way any code checks Pro status. No component queries the table directly.

## A.2 Eligibility gate

**A provider must hold Contact verification to purchase Pro. That is the only gate.**

Contact verification is free and already exists in the dashboard, so this is a low bar by design — but it means Pro can never sit on a completely unverified listing. Enforce it server-side at purchase, not only in the UI.

## A.3 Purchase

- Price and billing period read from config. **Do not hardcode.** The intended values, to be confirmed by me before you set them:
  - Standalone monthly: R249
  - Standalone annual: R2,490 (ten months, two free)
- Charged against the credit wallet, using the existing debit path found in Step 0. If the wallet is short, route to the existing top-up flow — do not build a new payment path.
- **Packages 2–5 include Pro automatically** at `source = package_included`. A provider on a ceiling package must never be charged for Pro. If they downgrade to base, the membership converts to `lapsed` unless they choose to buy it standalone — surface that choice, do not silently charge them.
- Lapse handling: on non-payment or period end without renewal, status → `lapsed` and every entitlement drops immediately. Never leave the badge showing on a lapsed membership.

## A.4 Display

- New badge component, visually distinct from verification badges. Gold `#C8A44D`, not the green `#14684F` verification family. Different shape.
- Tooltip must say plainly: this is a paid ServicePros Pro membership, and it is not a verification badge. Draft the copy and show it to me — do not ship copy I have not seen.
- Pro renders **alongside** the strongest verification badge, never instead of it. Do not touch the existing strongest-badge logic.
- **Pro must not affect ranking anywhere.** Not in search, not in category pages, not as a tiebreaker. Confirm explicitly in your report that no sort function reads membership status.
- Add a short Pro section to `/verification` explaining the difference, so the distinction is public.

---

# Batch B — Pro feature unlocks

Every unlock is gated by an entitlement key from A.1. None of them touch ranking or visibility.

- `pro.analytics` — provider dashboard analytics: profile views, search impressions, the queries that surfaced them, quote conversion. Build on whatever analytics data already exists; if none does, report that and stop rather than inventing a tracking system inside this batch.
- `pro.gallery_expanded` — raise the image cap from the free-tier value to 30. Read both numbers from config.
- `pro.listings_unlimited` — remove the free-tier service listing cap.
- `pro.profile_customisation` — accent colour, pinned service, custom CTA button label and target.
- `pro.publishing` — write to the Stories feed using the existing Tiptap editor.
- `pro.custom_slug` — a vanity profile URL. Needs a reserved-word blocklist and a uniqueness check; must not break existing canonical URLs or create duplicate-content SEO problems. Report your approach before building.
- `pro.team_seats` — additional dashboard users. If multi-user provider accounts do not exist yet, report that and defer this one.

Free-tier caps must come from config so I can tune the gap between free and Pro without a deploy.

---

# Batch C — Sponsored & featured inventory

## C.1 Three inventory types

- **Category-city feature** — rotating slot on category and city pages, sold by the week, per category-city pair.
- **Floating box** — site-wide rotation, sold monthly. This is the placement described in the earlier lifecycle spec.
- **Search top slot** — one reserved position above organic results on a category-city search, sold monthly.

Model these as a `sponsored_placements` table: provider_id, placement_type, scope (category and/or city), starts_at, ends_at, source (`purchased`, `rescue_grant`), price_paid, status.

## C.2 Rules that must be enforced in code, not just policy

- **30% of every placement type's slots are reserved, non-sellable, for `rescue_grant`.** The prior lifecycle spec grants free sponsored placement to providers with no sales at 2 months and again at 3 months. Paid inventory must never be able to consume those slots. Make the reserve percentage a config value.
- **Sponsored slots are reserved positions. They never reorder the organic list.** A sponsored provider appears in its own labelled slot and also, unchanged, in its natural organic position.
- **Density cap:** no more than one sponsored slot per ten organic results.
- **Visible disclosure** on every sponsored item — a "Sponsored" label that is legible, not a faint superscript. This is an ASA and CPA requirement, not a design preference.
- **Eligibility:** Contact verification current, no open disputes, no rating below the configured threshold. Enforced server-side at purchase and re-checked when a placement renders. A provider who falls below threshold mid-flight has the placement paused and the unused time credited back.
- **No auction, no per-lead, no per-click pricing.** Flat published rates only.

## C.3 Open questions — flag, do not guess

The earlier spec left these unanswered and they are still open:

1. How many sponsored providers appear at once in the floating box?
2. Rotation method — random, round-robin, or weighted?
3. Can a visitor dismiss the floating box, and does the dismissal persist?
4. Where on screen does it sit, and what happens on mobile?
5. Pricing per placement type — **do not set any price.** Leave the config values null with a `TODO(aya): confirm pricing` marker and make the feature refuse to sell until they are set.

## C.4 Featured strip

Convert the homepage "Businesses worth a closer look" section from its current selection mechanism to read from `sponsored_placements` where applicable, but keep an editorial fallback so the strip is never empty when nothing is sold. Do not let the homepage become 100% paid inventory.

---

## Rules for all three batches

- Read the codebase first. No invented facts, no invented conventions.
- Every rand amount, cap, threshold and percentage comes from config. Zero hardcoded commercial values.
- **Nothing you write may reference Yoco directly.** Pro purchases and sponsored placements debit the credit wallet through the existing internal debit path; only the top-up flow touches the payment provider. If you find yourself importing a Yoco SDK anywhere in this build, stop — you are in the wrong layer. This keeps the planned move back to Paystack a one-file change.
- Any advertising terms, refund terms for unused placement time, or Pro membership terms get a `TODO(aya): legal review` placeholder. Do not draft legal text.
- Never name a competitor in any copy.
- No new dependencies without asking.
- Stop and report at the end of each batch. Do not run A through C in one pass.