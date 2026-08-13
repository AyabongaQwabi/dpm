# New categories, service types, and seed data

## Why this exists

We were extending ServicePros' provider taxonomy with new verticals and
generating realistic Supabase test data so the commission-bracket logic,
category filtering, and region pages have real rows to exercise. The request
listed 10 candidate categories; 6 overlapped with existing ones under
different names (Legal, Security, Transport, Pets, Education, and
Real Estate/Property), so only the 4 genuinely new categories were added:

- **Funeral Services** (`funeral`)
- **Car Dealerships** (`dealerships`)
- **Construction & Civil** (`construction`)
- **Gardening & Landscaping** (`gardening`)

Along the way, verifying the new category pages surfaced a pre-existing bug
in the category filter that silently returned providers from *every*
category, not just the requested one — fixed as part of this change since it
blocked verification.

## What was built

### `supabase/migrations/20260723000000_new_categories.sql`

Follows the exact structure of the original `20260620000001_seed.sql` for
the 15 baseline categories:

- 4 `provider_categories` rows (`cat-funeral`, `cat-dealerships`,
  `cat-construction`, `cat-gardening`) with description + Phosphor icon name,
  matching the plain comma-separated-trades tone used elsewhere (e.g.
  `"Funeral parlours, undertakers, cremation services, tombstones, and repatriation."`).
- 22 `provider_types` across the 4 categories (funeral parlour, undertaker,
  cremation, tombstone, funeral cover advisor, repatriation; new/used/bakkie
  dealer, vehicle sourcing agent, trade-in broker; building contractor,
  renovation, paving, roofing, civil works, demolition; garden services,
  landscaping, tree felling, irrigation, lawn care).
- 16 specialist `fields` (e.g. `funeral_license_no`, `dealership_license_no`,
  `construction_nhbrc_no`) mirroring how e.g. Security's PSIRA number or
  Health's HPCSA number are modeled.
- `form_configs` (3 shared steps: Business Details / Gallery & Media / FAQs &
  Links) per category, plus a type-specific detail step for each category's
  two primary provider types.
- `form_config_fields` wiring the fields above into those steps.

No schema changes — this is INSERT-only against existing tables
(`provider_categories`, `provider_types`, `fields`, `form_configs`,
`form_config_fields`).

### `scripts/seed-new-categories.mjs` / `scripts/destroy-new-categories-seed.mjs`

A second seed script, not a rewrite of `seed-public-iteration.mjs` — that
script predates these categories and rewriting it risked touching its
existing, live-verified output. Same pattern: idempotent `.upsert()` on
deterministic `seed-*` ids, `is_seed: true` on every row, `.env.local` loaded
via the shared `scripts/load-env.mjs` helper.

Creates, per category, 3 providers (12 total) each with:

- Profile (bio explicitly says "seeded ... provider profile ... for
  marketplace testing"), gallery (3 Pexels stock photos per vertical), FAQs,
  social links, portfolio — spread round-robin across all 6 cities.
- 2 services with **explicit, deliberately spread prices** so commission
  bracket logic (`lib/domain/config.ts`: ≤999 / ≤4,999 / ≤9,999 / ≤49,999 /
  50,000+) gets exercised across at least 3 brackets per category — e.g.
  Car Dealerships has a R2,500–3,200 sourcing fee (bracket 2) next to a
  R135k–R320k vehicle sale (bracket 5).
- 1 default `service_packages` row per service, matching the service price.
- 2 customers, 2 bookings, 2 reviews (rating alternates 4/5 → 4.5 average,
  same convention as the original seed), 1 message thread + 2 messages per
  booking, 2 `content_posts` per provider (tip + social/promo).
- `service_sale_prices` rows across all 5 price-change bands, same multiplier
  set as `seed-public-iteration.mjs` (1.0×, 1.07×, 1.15×, 1.35×, 1.60×).

Registered in `package.json`:

```
pnpm seed:new-categories           # seed
pnpm seed:new-categories:destroy   # reverse — deletes only these 12 providers' rows
```

`pnpm seed:public:destroy`'s pattern was mirrored for the destroy script:
delete children first (posts, threads/messages, sale prices, reviews,
bookings, packages, services), then the providers and their customers. It
never touches rows outside the 12 deterministic provider ids it knows about.

After seeding, `node scripts/seed-verification-data.mjs` was re-run (it
already re-scans *all* providers ordered by id) so the new providers get a
realistic mix of Unverified / contact-verified / CIPC-verified /
FICA-verified, same as the rest of the dataset.

### Bug fix: `lib/public-data.ts` — category filter

`getPublishedProviders({ categorySlug })` builds a PostgREST query like:

```ts
.select(`... provider_types!inner(name, slug, provider_categories(name, slug)) ...`)
.eq('provider_types.provider_categories.slug', categorySlug)
```

The `.eq()` filter on a two-hop embedded path only takes effect if **every**
hop in the chain is marked `!inner` — `provider_types` had it,
`provider_categories` didn't. Result: every `/providers/category/[slug]`
page silently returned providers from *all* categories (verified directly —
`/providers/category/funeral` was rendering legal firms, event companies,
etc. alongside the 3 seeded funeral providers). This wasn't introduced by
this change; it surfaced while verifying the new category pages.

Fix: added `!inner` to the `provider_categories` embed. `provider_types.category_id`
is `NOT NULL`, so this can't exclude any provider that wasn't already
guaranteed to have a category.

## How to test

### 1. Apply the migration and seed

```bash
supabase link --project-ref <project-ref>   # confirm target is dev/staging, not prod
supabase db push
pnpm seed:new-categories
node scripts/seed-verification-data.mjs
```

Both the migration and the seed script are safe to re-run: the migration
uses `ON CONFLICT (id) DO NOTHING`, the seed script `.upsert()`s on
deterministic ids.

### 2. Automated checks

```bash
pnpm test    # vitest — should pass with no changes needed for this work
pnpm build   # next build — confirms the new routes/types compile
```

### 3. Manual verification

```bash
pnpm dev
```

- `http://localhost:3000/` — homepage "service categories" stat should read
  **19** (derived from `provider_categories.length`, not hardcoded — confirm
  by checking `lib/public-data.ts`'s `getCategories()` and
  `app/(public)/page.tsx`, there's no literal `19` anywhere).
- `http://localhost:3000/providers/category/funeral` (and `/dealerships`,
  `/construction`, `/gardening`) — each should show **exactly 3** providers,
  all belonging to that category. Spot-check that a legal or events provider
  does *not* appear on the funeral page (that's the bug described above).
- `http://localhost:3000/providers/category/legal` (or any of the original
  15) — should now also show only its own providers; this is the same fix
  applying retroactively, worth a quick regression glance.
- `http://localhost:3000/providers/in/<city>` for each of the 6 cities
  (`cape-town`, `johannesburg`, `durban`, `pretoria`, `stellenbosch`,
  `sandton`) — provider counts should include the new seeded providers.
- Open one seeded provider directly, e.g.
  `http://localhost:3000/providers/ubuntu-funeral-services` — check gallery,
  FAQs, 2 reviews averaging 4.5, and 2 posts render.

### 4. Tear down

```bash
pnpm seed:new-categories:destroy
```

Deletes only the 12 providers this seed created (and their services,
packages, bookings, reviews, posts, message threads, sale-price history) —
does not touch `seed-public-iteration.mjs`'s data or any real provider rows.
The 4 new categories, provider types, fields, and form configs are **not**
removed by the destroy script (they're structural/taxonomy data, seeded via
migration like the original 15 — removing a migration's `INSERT`s isn't
how this codebase reverts schema-seed data; write a follow-up migration if
they ever need to go).

## Known gaps / follow-ups

- No illustration/image assets were created for the 4 new categories — they
  use Phosphor icon names only (`Flower`, `CarProfile`, `HardHat`, `Plant`),
  consistent with how all 15 existing categories are rendered (icon name,
  not an image file). Nothing to follow up on unless the design later adds
  per-category illustration art, in which case treat it the same way the
  original 15 would need it too.
- `seed-public-iteration.mjs` (the original seed script, unrelated to this
  work) inserts `content_posts` rows without `title`/`slug`. That now
  violates the `content_posts_post_requires_title_slug` constraint added in
  `20260814000000_provider_posts.sql`, so re-running `pnpm seed:public`
  against a fresh database will fail on the content_posts insert. Out of
  scope here since it predates this change, but worth fixing before anyone
  next needs to re-seed from empty.
