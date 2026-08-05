# ServicePros Technical SEO Deep Dive

Date: 2026-08-05
Skills used: seo-technical, seo-programmatic, seo-schema

## Technical Score

Overall technical SEO score: 78/100.

ServicePros is in a healthy technical position for a Next.js marketplace: public routes are server-rendered, route metadata is mostly present, `robots.ts` references a sitemap, `sitemap.ts` generates dynamic provider/category/location URLs, security headers are configured in `next.config.ts`, and crawler access is intentionally separated for public, account, checkout, API, and AI agents.

The main issues are sitemap incompleteness, pagination canonical strategy, filter URL indexation, missing structured data on high-value pages, and lack of measured Core Web Vitals evidence.

## Category Breakdown

| Category | Status | Score | Notes |
| --- | --- | ---: | --- |
| Crawlability | warn | 78 | `robots.ts` is present and sitemap is referenced, but important public routes are missing from the sitemap. |
| Indexability | warn | 68 | Paginated pages canonicalize to page 1 in several templates while crawlable `?page=` links exist. |
| Security | pass | 88 | HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy exist. CSP is not configured. |
| URL structure | pass | 84 | Clean route patterns exist for providers, categories, locations, services, and top-rated city pages. Query filters need index controls. |
| Mobile | warn | 76 | App appears responsive from code patterns, but no Lighthouse/mobile rendering run was done in this pass. |
| Core Web Vitals | unknown | 60 | No CrUX/PageSpeed data available in this local audit. Image-heavy pages need field testing. |
| Structured data | warn | 76 | Good base; missing Service/Offer/Breadcrumb and enriched Organization/LocalBusiness. |
| JS rendering | pass | 86 | App Router/server components emit public content server-side on key pages. |
| IndexNow | backlog | 50 | Not implemented. Useful later for Bing/Yandex/Naver freshness. |

## Critical Issues

No immediate critical technical blockers were found in the local source.

## High Priority

### 1. Expand sitemap coverage

Current `app/sitemap.ts` includes:

- `/`
- `/search`
- `/feed`
- `/services`
- `/about`
- `/get-listed`
- `/pricing`
- provider profiles
- category pages
- location pages

Add confirmed indexable public routes:

- `/dpm`
- `/how-it-works`
- `/why-servicepros`
- `/verification`
- `/help`
- `/contact`
- `/platform-partners`
- `/referral-agents`
- `/providers/top-rated/[location]`
- `/providers/service/[slug]`
- `/services/[id]`
- `/providers/category/[slug]/in/[location]` when inventory passes quality gates

Google sitemap guidance recommends absolute URLs and only URLs intended for search results. It also caps individual sitemaps at 50,000 URLs or 50MB, so a future marketplace scale-up should move to sitemap indexes.

Source:

- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap

### 2. Fix paginated canonical rules

Current issue: category, location, category-location, service, top-rated, and search pagination appear to generate canonical URLs for the base route while `components/Pagination.tsx` exposes crawlable `?page=` links.

Recommended decision:

- If page 2+ should rank: each page gets a self-referencing canonical with `?page=n`.
- If page 2+ should not rank: use `noindex,follow`, keep crawlable links, and exclude those URLs from sitemap.

Google pagination guidance says each page in a paginated sequence should have a unique URL and should not canonicalize all pages to the first page.

Source:

- https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading

### 3. Control filter indexation

Indexable:

- static hub pages
- provider profile pages
- category pages
- location pages
- category-location pages that pass inventory and content gates
- service type pages that pass inventory and content gates

Not indexable by default:

- arbitrary `/search?q=...`
- multi-filter combinations
- sort URLs
- min/max price filters
- empty result pages

Recommended behavior:

- Clean programmatic route exists and quality gate passes: `index,follow`.
- Query filter URL is useful only to users: `noindex,follow`.
- Query filter duplicates a clean route: canonical to the clean route.

### 4. Add CSP after checking third-party needs

Current security headers are good, but no Content-Security-Policy was detected in `next.config.ts`. Add CSP after confirming all third-party domains:

- Supabase
- Yoco
- Resend or email-related endpoints if browser-used
- image CDNs
- analytics
- maps/Google Places if present

Start in report-only mode before enforcement.

## Medium Priority

### 5. Add structured data to service and programmatic pages

Use the plan in `SCHEMA-REPORT.md`:

- `Service` and `Offer` on `/services/[id]`
- `BreadcrumbList` across public SEO pages
- `OfferCatalog` on `/pricing`
- `ItemList` on `/providers/top-rated/[location]` and `/providers/service/[slug]`

### 6. Image SEO pass

Google image SEO guidance recommends standard HTML image elements, descriptive filenames, useful alt text, relevant page context, and representative `og:image`/schema images.

Source:

- https://developers.google.com/search/docs/appearance/google-images

Apply to:

- provider profile images
- service images
- city/region images
- DPM/verification/pricing OG images

### 7. Add technical QA commands to release checklist

Recommended release checks:

```bash
npm run lint
npm run build
curl -I https://servicepros.co.za
curl https://servicepros.co.za/robots.txt
curl https://servicepros.co.za/sitemap.xml
```

Post-deploy checks:

- Google Rich Results Test for schema pages
- Schema Markup Validator
- PageSpeed Insights mobile test on `/`, `/search`, `/providers/[slug]`, `/services/[id]`
- Search Console indexing inspection for new programmatic templates

## Low Priority

### 8. IndexNow

Implement after sitemap/index strategy is stable. It can speed discovery for non-Google engines, but it should not come before sitemap and canonical cleanup.

### 9. Image sitemap

Useful later if provider/service images become a meaningful discovery surface. For now, focus on HTML discoverability, stable image URLs, and representative OG/schema images.

## AI Crawler Strategy

Current `robots.ts` allows major AI crawlers on public pages while blocking account, dashboard, API, and checkout paths. This supports answer-engine visibility while protecting private/workflow surfaces.

Current AI crawler group:

- `GPTBot`
- `ChatGPT-User`
- `Google-Extended`
- `PerplexityBot`
- `ClaudeBot`
- `anthropic-ai`

Google documents `Google-Extended` as a product token that does not affect Google Search inclusion or ranking. Keeping it allowed is an AI-visibility choice, not a classic SEO requirement.

Source:

- https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers

## Technical Implementation Backlog

1. Add missing sitemap routes.
2. Decide paginated canonical/noindex policy and implement consistently.
3. Add `robots` metadata for non-indexable filter views.
4. Add `BreadcrumbList`, `Service`, `Offer`, `OfferCatalog`, and missing `ItemList` schema.
5. Add CSP report-only.
6. Add page-specific OG images for DPM, pricing, verification, get-listed, and service pages.
7. Run Lighthouse/PageSpeed after local code changes and again after production deployment.

