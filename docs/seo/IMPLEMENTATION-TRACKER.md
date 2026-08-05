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
| Pending | Add breadcrumbs to public SEO pages. | public route pages | Schema and optional visual breadcrumbs. |
| Pending | Enrich Organization/LocalBusiness only with confirmed data. | `lib/seo.ts`, contact/about/provider pages | Do not invent legal or contact facts. |

## Phase 3: Metadata and Page Structure

| Status | Task | Files likely involved | Notes |
| --- | --- | --- | --- |
| Pending | Apply recommended metadata patterns. | public route metadata exports | Avoid duplicate brand suffixes. |
| Pending | Improve service detail metadata. | `app/(public)/services/[id]/page.tsx` | Provider/city/price/image context. |
| Pending | Confirm one H1 per public SEO page. | `app/(public)/**/page.tsx`, components | Current scan mostly OK. |
| Pending | Add snippet-ready blocks to DPM. | `app/(public)/dpm/page.tsx` | Define DPM clearly near top. |
| Pending | Add snippet-ready blocks to how-it-works. | `app/(public)/how-it-works/page.tsx` | Step summary. |
| Pending | Add snippet-ready blocks to pricing. | `app/(public)/pricing/page.tsx` | Credit definition and refund note. |
| Pending | Add snippet-ready blocks to verification. | `app/(public)/verification/page.tsx` | Badge meaning table. |
| Pending | Add snippet-ready blocks to get-listed. | `app/(public)/get-listed/page.tsx` | Provider onboarding steps/no pay-per-lead. |
| Pending | Add snippet-ready blocks to platform-partners. | `app/(public)/platform-partners/page.tsx` | Partner definition/terms summary. |
| Pending | Add jump links on long explainers. | DPM/how/pricing/verification/why/provider-terms | Only where useful. |

## Phase 4: Programmatic SEO Quality Gates

| Status | Task | Files likely involved | Notes |
| --- | --- | --- | --- |
| Pending | Add inventory thresholds for category-location pages. | category-location page, data helpers | Below threshold: noindex or broader fallback. |
| Pending | Add index/noindex policy helper. | `lib/seo.ts` or new SEO policy helper | Keep simple and explicit. |
| Pending | Normalize service titles for service-type pages. | `lib/public-data.ts`, service route | Consolidate duplicate/messy titles. |
| Pending | Add related link components/data. | listing templates | Category/city/service/provider context. |
| Pending | Add sitemap inclusion gates. | `app/sitemap.ts` | Sitemap should only list indexable pages. |
| Pending | Add lightweight SEO audit command/script. | `scripts/` or docs | Detect empty pages, duplicate slugs, sitemap/noindex conflicts. |

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
