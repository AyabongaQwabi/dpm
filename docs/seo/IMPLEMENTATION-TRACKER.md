# SEO Implementation Tracker

Last updated: 2026-08-05
Overall status: In progress

Use this file to track implementation across multiple runs. Update it at the start and end of every SEO implementation run.

Status values:

- `Pending`: not started
- `In progress`: currently being implemented
- `Done`: implemented and verified
- `Blocked`: cannot proceed without a decision or missing data
- `Deferred`: intentionally postponed

## Run Log

| Date | Agent/run | Summary | Validation |
| --- | --- | --- | --- |
| 2026-08-05 | Documentation setup | Created implementation tracker and implementation prompt. | Docs-only; no tests run. |
| 2026-08-05 | Implementation run 1 | Expanded sitemap coverage for static SEO pages, service detail pages, qualified service-type pages, top-rated city pages, qualified category-location pages, and added `OAI-SearchBot` to AI crawler access. | `npm run lint` passed with pre-existing warnings; `npx tsc --noEmit --pretty false --incremental false` passed; `npm run build` passed after permission-adjusted rerun. |
| 2026-08-05 | Implementation run 2 | Added `noindex,follow` controls for paginated listing pages beyond page 1 and for search/service filter URLs, while preserving clean base canonicals. Deferred CSP report-only until third-party browser domains are fully audited. | `npm run lint` passed with pre-existing warnings; `npx tsc --noEmit --pretty false --incremental false` passed; `npm run build` passed after permission-adjusted rerun. |
| 2026-08-05 | Implementation run 3 | Added schema helpers, homepage WebSite SearchAction, Service/Offer schema for service detail pages, OfferCatalog schema for pricing, and ItemList/Breadcrumb schema for top-rated and service-type provider pages. | `npm run lint` passed with pre-existing warnings; `npx tsc --noEmit --pretty false --incremental false` passed; `npm run build` passed with normal filesystem permissions. |
| 2026-08-05 | Implementation run 4 | Added BreadcrumbList schema to crawlable public discovery, guide, pricing, profile, category, city, and partner/referral pages. | `npm run lint` passed with pre-existing warnings; `npx tsc --noEmit --pretty false --incremental false` passed; `npm run build` passed after permission-adjusted rerun. |
| 2026-08-05 | Implementation run 5 | Completed Phase 3: confirmed one H1 per public page; upgraded `/services/[id]` `generateMetadata` with provider/city/price context and an unpublished-provider guard; added snippet-ready answer blocks to `/dpm`, `/how-it-works`, `/pricing`, `/get-listed`, and `/platform-partners`; added jump-link navs to `/how-it-works` and `/verification`. | `npm run lint` passed with pre-existing warnings only; `npx tsc --noEmit --pretty false --incremental false` passed with no output; `npm run build` passed (938 tests, Next build succeeded). |
| 2026-08-05 | Implementation run 6 | Completed Phase 4: added `SEO_INDEX_THRESHOLDS`/`seoIndexPolicy` helper in `lib/seo.ts`; added `normalizeServiceTypeSlug` in new `lib/domain/service-title.ts` and used it consistently in the service-type page and sitemap (previously they used different, disagreeing slug logic); applied the provider-count/service-count noindex gate to the category-location and service-type pages; added related-links sections to both; aligned sitemap gating to the same shared thresholds; added `scripts/seo-audit.mjs` (`npm run seo:audit`) and ran it against live data (0 duplicate slugs, 0 missing slugs, 125 correctly-noindexed thin category-location pairs, 0 thin service types). | `npm run lint` passed with pre-existing warnings only; `npx tsc --noEmit --pretty false --incremental false` passed with no output; `npm run build` passed (938 tests, Next build succeeded); `npm run seo:audit` ran successfully against live Supabase data. |

## Phase 1: Technical Foundation

| Status | Task | Files likely involved | Notes |
| --- | --- | --- | --- |
| Done | Expand sitemap coverage for static SEO routes. | `app/sitemap.ts` | Added DPM, how-it-works, why-servicepros, verification, help, contact, platform-partners, and referral-agents. |
| Done | Add sitemap coverage for service detail pages. | `app/sitemap.ts`, `lib/public-data.ts` | Added published services whose providers are published. |
| Done | Add sitemap coverage for qualified service type pages. | `app/sitemap.ts`, `lib/public-data.ts` | Added service-type routes when 2+ published services share the normalized service title slug. |
| Done | Add sitemap coverage for top-rated city pages. | `app/sitemap.ts` | Added for locations returned by published provider location data. |
| Done | Add sitemap coverage for qualified category-location pages. | `app/sitemap.ts` | Added category-location routes only when 3+ published providers exist for the pair. |
| Done | Decide and implement pagination canonical/noindex strategy. | category/location/search/services/top-rated pages | Applied `noindex,follow` to page 2+ while keeping clean base canonicals. |
| Done | Add noindex/canonical controls for search and service filters. | `/search`, `/services` | Search filter URLs and services filter URLs now use `noindex,follow`; search filters canonicalize to `/search`, services filters canonicalize to `/services`. |
| Deferred | Evaluate CSP report-only config. | `next.config.ts` | Deferred until third-party browser domains, inline script needs, payments, analytics, Supabase assets, and any map/place embeds are fully audited. |

## Phase 2: Schema Implementation

| Status | Task | Files likely involved | Notes |
| --- | --- | --- | --- |
| Done | Add `breadcrumbJsonLd` helper. | `lib/seo.ts` | Uses absolute canonical URLs. |
| Done | Add `serviceJsonLd` helper. | `lib/seo.ts` | Reflects visible service, provider, package, and rating data when supplied. |
| Done | Add `offerCatalogJsonLd` helper. | `lib/seo.ts` | Pricing/credits. |
| Done | Add `webSiteJsonLd` helper with SearchAction. | `lib/seo.ts`, `/` | Homepage emits WebSite SearchAction. |
| Done | Add optional `imageObjectJsonLd` helper. | `lib/seo.ts` | Available for page-specific images. |
| Done | Emit `Service` and `Offer` schema. | `app/(public)/services/[id]/page.tsx` | Includes provider/packages where available plus breadcrumb schema. |
| Done | Emit `OfferCatalog` schema. | `app/(public)/pricing/page.tsx` | Uses live credit pack config data. |
| Done | Emit missing `ItemList` schema. | `providers/top-rated`, `providers/service` pages | Matches visible providers/listings and includes breadcrumbs. |
| Done | Add breadcrumbs to public SEO pages. | public route pages | Added JSON-LD breadcrumbs to crawlable public SEO pages; noindex legal, checkout, claim, and transactional pages intentionally left out. |
| Pending | Enrich Organization/LocalBusiness only with confirmed data. | `lib/seo.ts`, contact/about/provider pages | Do not invent legal or contact facts. |

## Phase 3: Metadata and Page Structure

| Status | Task | Files likely involved | Notes |
| --- | --- | --- | --- |
| Done | Apply recommended metadata patterns. | public route metadata exports | Existing titles/descriptions for dpm, how-it-works, pricing, verification, get-listed, platform-partners already matched META-OPTIMIZATION.md; no change needed there. Service detail metadata upgraded (see below). |
| Done | Improve service detail metadata. | `app/(public)/services/[id]/page.tsx` | `generateMetadata` now queries provider business name/city and package pricing; title is `{Service} by {Provider}`, description includes city and lowest price, and Open Graph title/description match. Returns `{}` if provider is unpublished (previously only checked service publish state). |
| Done | Confirm one H1 per public SEO page. | `app/(public)/**/page.tsx`, components | Verified: exactly one `<h1>` per scanned public page. |
| Done | Add snippet-ready blocks to DPM. | `app/(public)/dpm/page.tsx` | Added "Directory vs marketplace" H2 + short-paragraph answer targeting that PAA query. |
| Done | Add snippet-ready blocks to how-it-works. | `app/(public)/how-it-works/page.tsx` | Added a 3-sentence "how does ServicePros work" answer directly under the hero, ahead of the visual step tracker. |
| Done | Add snippet-ready blocks to pricing. | `app/(public)/pricing/page.tsx` | Added "How ServicePros credits work" H2 + definition paragraph before the credit pack cards (existing FAQ section already covered expiry/refund). |
| Done | Add snippet-ready blocks to verification. | `app/(public)/verification/page.tsx` | Already had badge-order intro, per-tier detail grid, and guarantee section from a prior run; no new copy needed, only jump-link anchors added (see below). |
| Done | Add snippet-ready blocks to get-listed. | `app/(public)/get-listed/page.tsx` | Added "Does ServicePros charge for leads?" H2 + no-pay-per-lead / onboarding-steps answer ahead of the benefits grid. |
| Done | Add snippet-ready blocks to platform-partners. | `app/(public)/platform-partners/page.tsx` | Added "What are ServicePros platform partners?" H2 + definition paragraph ahead of the existing comparison grid. |
| Done | Add jump links on long explainers. | `app/(public)/how-it-works/page.tsx`, `app/(public)/verification/page.tsx` | Added anchor nav + `id`/`scroll-mt-24` on each numbered section. Skipped DPM, pricing, why-servicepros, and provider-terms — those pages are shorter or already broken into few enough sections that a jump nav would add clutter without helping scannability. |

## Phase 4: Programmatic SEO Quality Gates

| Status | Task | Files likely involved | Notes |
| --- | --- | --- | --- |
| Done | Add inventory thresholds for category-location pages. | `app/(public)/providers/category/[slug]/in/[location]/page.tsx`, `lib/seo.ts` | `generateMetadata` now fetches the live provider count (page 1 only, `pageSize: 1` for a cheap count-only query) and applies `seoIndexPolicy` against `SEO_INDEX_THRESHOLDS.categoryLocationMinProviders` (3). Below threshold the page still renders (useful for users/internal linking) but is `noindex,follow`. |
| Done | Add index/noindex policy helper. | `lib/seo.ts` | Added `SEO_INDEX_THRESHOLDS` (category-location: 3 providers, service-type: 2 services) and `seoIndexPolicy(count, min)` returning `undefined` or `{ index: false, follow: true }`. Shared by the sitemap and both gated page routes so thresholds can't drift between them. |
| Done | Normalize service titles for service-type pages. | `lib/domain/service-title.ts` (new), `app/(public)/providers/service/[slug]/page.tsx`, `app/sitemap.ts` | Added `normalizeServiceTypeSlug()`: strips `service`/`services`/`solution`/`solutions` noise words and singularizes trailing plurals, so "Logo Design", "logo design service", and "logo designs" collapse to `logo-design`. Previously the page matched services by a raw case-insensitive substring on the *unnormalized* title while the sitemap grouped by a different (`slugifyName`) slug — the two could disagree on which services belong to a given page. Both now use the same normalizer, and the page also applies `seoIndexPolicy` for the 2-service threshold. |
| Done | Add related link components/data. | `app/(public)/providers/category/[slug]/in/[location]/page.tsx`, `app/(public)/providers/service/[slug]/page.tsx` | Category-location pages now link to the parent category, parent city, and up to 5 sibling categories in the same city. Service-type pages now link to up to 6 cities with that service and to `/services`. Plain category (`/providers/category/[slug]`) and location (`/providers/in/[location]`) pages already had equivalent cross-links from earlier runs — no change needed there. |
| Done | Add sitemap inclusion gates. | `app/sitemap.ts` | Sitemap already gated category-location (3+) and service-type (2+) inclusion from a prior run; now imports `SEO_INDEX_THRESHOLDS` from `lib/seo.ts` and `normalizeServiceTypeSlug` from `lib/domain/service-title.ts` instead of local constants/`slugifyName`, so sitemap inclusion and page-level `noindex` can never disagree on the threshold or the grouping. |
| Done | Add lightweight SEO audit command/script. | `scripts/seo-audit.mjs` (new), `npm run seo:audit` | Read-only script against the live Supabase data: duplicate provider slugs, category-location pairs below threshold (informational — confirms they're correctly noindexed), service-type slugs below threshold, and published providers missing a slug. Ran it live: 0 duplicate slugs, 0 missing slugs, 125 category-location pairs below threshold (all real long-tail city/category combinations with 1-2 providers — expected given current data volume, and each is already `noindex,follow` per the gate above, not indexed-but-empty). Exits non-zero when issues are found so it can gate CI later. |

## Phase 5: Authority and Trust

| Status | Task | Files likely involved | Notes |
| --- | --- | --- | --- |
| Pending | Resolve public contact placeholders with confirmed data. | `app/(public)/contact/page.tsx` | Block if data is unavailable. |
| Pending | Add last-updated/editorial ownership notes. | trust/guide pages | Keep accurate. |
| Pending | Add provider badge/backlink guidance. | get-listed/provider resources | Optional. |
| Pending | Add marketplace data blocks from real data. | home/about/trust pages | Do not invent metrics. |
| Pending | Enrich Organization schema with confirmed business details. | `lib/seo.ts` | Needs verified legal/contact info. |
| Pending | Add provider-facing search and AI discovery selling points. | `get-listed`, `why-servicepros`, pricing/provider surfaces, platform-partners | Use safe non-guarantee wording from `AI-CITATION-PROVIDER-VISIBILITY.md`. |
| Pending | Add AI citation/ranking disclaimer near stronger discovery claims. | provider acquisition pages | Do not promise rankings or citations. |
| Done | Add/confirm `OAI-SearchBot` crawler access if AI visibility is desired. | `app/robots.ts` | Added `OAI-SearchBot` to the AI crawler group while keeping account/dashboard/API/checkout disallows. |

## Phase 6: Image SEO

| Status | Task | Files likely involved | Notes |
| --- | --- | --- | --- |
| Pending | Create SEO image directory. | `public/images/seo/` | Add only when assets exist or are generated. |
| Pending | Add page-specific OG images. | metadata exports, `lib/seo.ts` | DPM, pricing, verification, get-listed, why, partners, referrals. |
| Pending | Add image schema where useful. | `lib/seo.ts`, public pages | Use `ImageObject`/`primaryImageOfPage`. |
| Pending | Improve provider/service image alt text formulas. | provider/service card pages | Avoid keyword stuffing. |
| Pending | Add image optimization notes to provider upload guidance. | provider dashboard copy/docs | Keep UX copy practical. |

## Phase 7: Safe Comparison Pages

| Status | Task | Files likely involved | Notes |
| --- | --- | --- | --- |
| Pending | Confirm legal posture for comparison pages. | tracker/docs | Do not name competitors without approval. |
| Pending | Implement `/compare/service-marketplace-models`. | new public route | Neutral model comparison only. |
| Pending | Implement `/compare/provider-fee-models`. | new public route | Leads/listings/commission model education. |
| Pending | Implement `/compare/how-to-compare-service-platforms`. | new public route | Customer platform evaluation guide. |
| Pending | Implement `/compare/directory-vs-marketplace`. | new public route | Link to DPM. |
| Pending | Add comparison page schema. | `lib/seo.ts`, compare pages | `WebPage`, `BreadcrumbList`, `ItemList`. |
| Pending | Add comparison routes to sitemap after review. | `app/sitemap.ts` | Only after legal/content review. |

## Blocked Decisions

| Decision | Needed from | Status | Notes |
| --- | --- | --- | --- |
| Legal/company contact details for contact page and Organization schema. | Product/legal/business owner | Open | Do not invent. |
| Pagination strategy: index page 2+ or noindex page 2+. | SEO/product owner | Open | Default recommendation: `noindex,follow` page 2+ unless inventory is strong. |
| Named competitor pages. | Legal/product owner | Open | Current recommendation: avoid; use neutral model comparisons. |
| Paid image generation approval. | Product owner | Open | Current work should use plans/placeholders only. |

## Validation History

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-08-05 | Not run | Docs-only | Tracker created. |
| 2026-08-05 | `npm run lint` | Passed with warnings | Warnings were pre-existing unused imports/hooks warnings outside this batch. |
| 2026-08-05 | `npx tsc --noEmit --pretty false` | Failed due local write permission | Could not write `tsconfig.tsbuildinfo`; reran with incremental disabled. |
| 2026-08-05 | `npx tsc --noEmit --pretty false --incremental false` | Passed | Type check validation for this batch. |
| 2026-08-05 | `npm run build` | Passed after permission-adjusted rerun | Initial sandbox run passed tests but failed writing `.next/trace-build`; escalated rerun passed tests and Next build. |
| 2026-08-05 | `npm run lint` | Passed with warnings | Implementation run 2; warnings were pre-existing unused imports/hooks warnings outside this batch. |
| 2026-08-05 | `npx tsc --noEmit --pretty false --incremental false` | Passed | Type check validation for pagination/filter metadata controls. |
| 2026-08-05 | `npm run build` | Passed after permission-adjusted rerun | Initial sandbox run passed tests but failed writing `.next/trace`; escalated rerun passed tests and Next build. |
| 2026-08-05 | `npm run lint` | Passed with warnings | Implementation run 3; warnings were pre-existing unused imports/hooks warnings outside this batch. |
| 2026-08-05 | `npx tsc --noEmit --pretty false --incremental false` | Passed | Type check validation for schema helpers and page JSON-LD usage. |
| 2026-08-05 | `npm run build` | Passed | Ran with normal filesystem permissions because Next writes `.next/trace` during production build. |
| 2026-08-05 | `npm run lint` | Passed with warnings | Implementation run 4; warnings were pre-existing unused imports/hooks warnings outside this batch. |
| 2026-08-05 | `npx tsc --noEmit --pretty false --incremental false` | Passed | Type check validation for breadcrumb JSON-LD usage. |
| 2026-08-05 | `npm run build` | Passed after permission-adjusted rerun | Initial sandbox run passed tests but failed writing `.next/trace`; escalated rerun passed tests and Next build. |
| 2026-08-05 | `npm run lint` | Passed with warnings | Implementation run 5; warnings were pre-existing unused imports/hooks warnings outside this batch. |
| 2026-08-05 | `npx tsc --noEmit --pretty false --incremental false` | Passed | No output; type check clean for Phase 3 metadata/content changes. |
| 2026-08-05 | `npm run build` | Passed | Ran with normal filesystem permissions; 938 tests passed and Next build generated all 99 pages successfully. |
| 2026-08-05 | `npm run lint` | Passed with warnings | Implementation run 6; warnings were pre-existing unused imports/hooks warnings outside this batch. |
| 2026-08-05 | `npx tsc --noEmit --pretty false --incremental false` | Passed | No output; type check clean for Phase 4 quality-gate changes. |
| 2026-08-05 | `npm run build` | Passed | 938 tests passed; Next build generated all 99 pages successfully. |
| 2026-08-05 | `npm run seo:audit` | Ran successfully | 0 duplicate provider slugs, 0 providers missing a slug, 125 category-location pairs below threshold (all correctly noindexed, not indexed-empty), 0 thin service-type slugs. |
