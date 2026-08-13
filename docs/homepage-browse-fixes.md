# Homepage and browse fixes

Three small, independent fixes to the homepage and browse experience, plus one
pre-existing correctness gap closed along the way. Each landed as its own commit
so any of them can be reviewed or reverted independently.

## Why this exists

The homepage category grid was showing categories with zero live providers, the
city tiles were showing counts that didn't reconcile with reality, and the nav
"near you" item rendered whatever city name Vercel's IP-geolocation service
returned verbatim — with no check that the city actually has providers, or that
it's even in South Africa. This build fixes all three, from an evidence-first
read of the actual data (see "Reconciliation numbers" below) rather than assumed
causes.

## What was built, commit by commit

### `fix(homepage): filter is_published in getCategories() provider counts`

`getCategories()` in `lib/public-data.ts` counted every provider linked to a
category regardless of publish status — every other query in that file filters
`is_published`. Currently a no-op (all 4,337 providers in the DB are published),
but left the tile-count logic wrong as soon as an unpublished provider exists.
Isolated into its own commit since it's unrelated to the threshold work in Part 1
and should be independently revertable if the no-op assumption turns out wrong.

### Part 1 — Hide empty categories

- **`config/browse.json`** (new): `minTileProviders.value` = 5, unconfirmed
  (`TODO(aya): confirm`). Deliberately lower than `liquidity.json`'s
  `liquidCell.minProvidersPerCell` (8) — this only means "not embarrassingly
  empty" for a public tile, not "operationally liquid" for the internal
  dashboard. Also carries `defaultCity.value` (used by Part 3).
- **`lib/browse-config.ts`**: typed accessor, same pattern as
  `lib/liquidity-config.ts`.
- **`lib/domain/browse.ts`** (new, pure): `isTileVisible` / `filterVisibleTiles`.
  No DB, no framework imports.
- **`app/(public)/page.tsx`**: homepage category grid now filters through
  `filterVisibleTiles`, hiding the 4 categories currently at 0 providers (Car
  Dealerships, Construction & Civil, Funeral Services, Gardening & Landscaping).
- **`app/(public)/providers/category/[slug]/page.tsx`** and
  **`app/(public)/providers/in/[location]/page.tsx`**: below-threshold pages stay
  reachable by direct URL (no `notFound()` gate added) but get
  `robots: { index: false, follow: true }` via `seoIndexPolicy()` — the existing
  helper in `lib/seo.ts` already used by `providers/service/[slug]/page.tsx`,
  reused here rather than inventing a second threshold-to-robots helper.

### Part 2 — Fix the city-count reconciliation gap

Step-0 investigation found the three numbers didn't reconcile: category-tile sum
4,337, city-tile sum (as rendered) 181, total published providers with a
non-null city 4,337. The gap was **not** unresolved/suburb-level city data —
every published provider already has a `location_city` value. The real cause:

- **`lib/public-data.ts` `getLocations()`** applied `.limit(200)` to the Supabase
  query *before* aggregating counts in JS, so every city's count was computed
  from an arbitrary 200-row slice instead of the full published-provider set
  (Cape Town showed 58 instead of the true 305 — roughly a 4–5x understatement
  everywhere). Fix: removed the query-level cap; the `limit` parameter now only
  slices the already-aggregated, already-sorted result, exactly as callers
  already expected. supabase-js has no `GROUP BY`, so this is a full-column
  fetch (4,337 rows of one text column today) aggregated in JS — cheap at this
  scale, and the least-surprising fix given the file's existing conventions.
  A comment above the function logs the 60 raw `location_city` values/counts as
  of 2026-08-13, so future `metro` rollup work (needed for price guides and
  programmatic city×category SEO, per your note — **not built here**, deliberately
  out of scope) doesn't have to re-derive the suburb list from scratch.
- **`app/(public)/browse/cities/page.tsx`** (new): every city with
  `>= minTileProviders` providers, not just the homepage's top-8 tiles — the long
  tail (15 cities clear the threshold today) stays reachable and indexable.
  Wired into `app/sitemap.ts`.
- The `getLocations(supabase, 200)` calls already used by `generateStaticParams`
  and the sitemap now return up to 200 *real* distinct cities instead of a
  truncated, arbitrarily-ordered sample — an accuracy improvement that came free
  from the same fix.

**Metro/suburb rollup table: deliberately not built.** Confirmed no `metro`
concept exists anywhere in the schema before this work, and nothing in this fix
requires one — the gap was a bug, not a data-modeling gap. Building it now would
have been scope creep; it's flagged as a future dependency instead.

### Part 3 — Geo-location nav accuracy

The nav "near you" item (`components/SiteNav.tsx`) used to render
`x-vercel-ip-city` verbatim with no snapping and no override mechanism — the
"Columbus" problem: any city name Vercel's edge network returns, real or not,
in South Africa or not, with providers or not.

- **`lib/domain/geo-location.ts`** (new, pure): `haversineDistanceKm`,
  `snapToNearestCity` (never returns a city below `minTileProviders`), and
  `resolveNavLocation` — the full fallback-priority decision, kept pure and
  DB-free so it's directly unit-testable without mocking `next/headers`.
- **`config/city-coordinates.json`** + **`lib/city-coordinates.ts`** (new):
  static lat/lng for the ~60 South African cities/suburbs currently in the DB.
  This is geographic reference data for the distance calculation only — the
  actual *known-city list* (which cities exist, how many providers each has)
  always comes from the live `getLocations()` query, never from this file. A
  live city with no coordinate entry here is just excluded from snapping
  eligibility, not an error.
- **`proxy.ts`**: now forwards `x-vercel-ip-latitude` / `x-vercel-ip-longitude`
  (as `x-user-ip-lat` / `x-user-ip-lng`) and `x-vercel-ip-country` (as
  `x-user-ip-country`) alongside the pre-existing city-name header, so
  `getUserLocation()` can snap by distance instead of trusting the city name.
- **`sp_user_city` cookie** (`lib/tenant.ts`): persists an explicit city
  selection, no auth required. Written by `/api/geo-location` after a
  successful browser-geolocation snap; nothing currently writes it from a
  manual city picker UI, since the prompt asked for the persistence mechanism,
  not a new picker surface — trivial to wire a picker to this cookie later.
- **`app/api/geo-location/route.ts`** + **`components/GeoLocationResolver.tsx`**
  (new): client component fires once per visitor (gated on whether the cookie
  is already set), asks `navigator.geolocation`, POSTs coordinates to the route,
  which snaps server-side and sets the cookie, then the client calls
  `router.refresh()`. Silent no-op on denial, error, or unsupported browsers —
  IP-geolocation and the configured default are always there as fallback, so
  this is a pure upgrade, never a blocker.
- **`lib/tenant.ts` `getUserLocation()`**: rewritten around
  `resolveNavLocation()`, same public return type
  (`{ city, slug } | null`), so `SiteNav` / `app/(public)/layout.tsx` callers
  are unaffected. Priority order implemented exactly as specified:
  1. `sp_user_city` cookie (manual pick or a completed browser-geolocation snap).
  2. Vercel IP-geolocation coordinates, ZA-only, snapped to nearest known city.
  3. Configured `default_city` (`config/browse.json`, unconfirmed — suggested
     "Cape Town"), only if it currently has `>= minTileProviders` providers.
  4. `null` — caller renders the neutral "Near you" label, never a dead-end city.

## Data-model notes worth knowing before extending this

- **No `lat`/`lng` columns exist on `providers`.** The known-city list is names
  only. `config/city-coordinates.json` is a hand-maintained static lookup for
  the cities currently in the DB — it will need new entries as new cities
  appear, or the snap simply won't have a distance for them (city stays
  reachable via the city-name header and pages, just not snap-eligible).
- **`getLocations()` now does a full-column fetch with no query-level cap.** Fine
  at 4,337 rows; if the provider base grows by orders of magnitude, revisit
  whether this needs a real `GROUP BY` (would require an RPC — none exists in
  this codebase today).
- **The metro/suburb rollup is still absent by design** (see Part 2). Anything
  that eventually needs "Sandton counts toward Johannesburg" — price guides,
  programmatic city×category SEO — will need that table; this build's raw
  city/count comment in `lib/public-data.ts` is the starting point for it.

## How to test this

### Automated

```bash
npx tsc --noEmit   # this repo has no `typecheck` script
pnpm lint
pnpm test
```

All new logic is covered by two kinds of test, matching this repo's existing
conventions:

- **Pure-logic tests**:
  - `lib/domain/__tests__/browse.test.ts` — `isTileVisible`, `filterVisibleTiles`,
    and the `seoIndexPolicy()` reachability/indexability behavior at the
    threshold boundary.
  - `lib/domain/__tests__/geo-location.test.ts` — `haversineDistanceKm` sanity
    (Cape Town↔Johannesburg ≈ 1,270km), `snapToNearestCity` (never returns a
    below-threshold city even when it's geographically nearest), and
    `resolveNavLocation`'s full priority chain, including the required case: a
    non-ZA or zero/below-threshold-provider result falls through to the
    configured default rather than rendering.
- **Architecture tests** (`lib/__tests__/browse-cities-architecture.test.ts`) —
  static assertions that `getLocations()` no longer applies `.limit()` before
  aggregating, and that `/browse/cities` reuses the shared `MIN_TILE_PROVIDERS`
  threshold rather than a second one. Matches this repo's existing pattern of
  testing query/migration shape as text where there's no live Postgres harness.

### Manual, once deployed (or via a local dev server against the linked Supabase project)

1. **Empty categories hidden**
   - Visit `/`. Confirm the category grid does not show Car Dealerships,
     Construction & Civil, Funeral Services, or Gardening & Landscaping (all at
     0 providers today).
   - Visit `/providers/category/dealerships` directly. Confirm the page still
     renders (not a 404) and view source / check response headers for
     `<meta name="robots" content="noindex,follow">` (or inspect
     `generateMetadata`'s returned `robots` field in a debugger).

2. **City tiles reconciled**
   - Visit `/`. Confirm the city tiles show materially higher counts than
     before (Cape Town ≈ 305, not 58; Durban ≈ 186, not 41).
   - Visit `/browse/cities`. Confirm cities beyond the homepage's top 8 (e.g.
     Berea, Centurion, Edenvale, Midrand, Alberton, Ballito) are listed and
     linkable.

3. **Geo-nav accuracy**
   - Clear cookies, load the site from a South African IP (or a VPN/proxy
     simulating one). Confirm the nav "near you" item shows a real city with
     providers, not whatever raw string Vercel's edge network reports.
   - Grant browser location permission when prompted (first visit only — check
     `document.cookie` for `sp_user_city` before/after). Confirm the nav item
     updates to the nearest city with live providers after the page refreshes.
   - Simulate a non-ZA IP or deny geolocation entirely with no cookie set.
     Confirm the nav falls back to the configured default city (or "Near you" if
     the default itself has no live providers) — never a random or empty city.
   - `curl -X POST /api/geo-location -H 'content-type: application/json' -d '{"lat": -26.2041, "lng": 28.0473}'`
     and confirm the response snaps to Johannesburg and sets `sp_user_city`.

### What's intentionally not covered

- No manual city-picker UI was built — only the cookie + resolution mechanism
  the prompt asked for. A picker can set `sp_user_city` directly once designed.
- No live Postgres test harness exists in this repo, so the reconciliation
  numbers above were captured via a one-off script against the linked Supabase
  project, not as an automated test — they're a point-in-time snapshot, not a
  regression guard. Re-run the query described in the original investigation if
  the provider base changes significantly and these numbers need re-verifying.
