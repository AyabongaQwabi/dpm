# ServicePros Programmatic SEO Governance

Date: 2026-08-05
Skills used: seo-programmatic, seo-technical, seo-content

## Programmatic SEO Score

Overall programmatic SEO score: 72/100.

The platform already has the right data-driven page families: provider profiles, category pages, location pages, category-location pages, service type pages, top-rated city pages, and service detail pages. The risk is not the URL architecture; the risk is publishing too many pages whose visible value differs only by a category or city name.

## Assessment Summary

| Category | Status | Score |
| --- | --- | ---: |
| Data quality | warn | 70 |
| Template uniqueness | warn | 62 |
| URL structure | pass | 86 |
| Internal linking | warn | 74 |
| Thin content risk | warn | 58 |
| Index management | warn | 66 |

## Programmatic Page Families

| Template | URL | Data source | Index by default? | Notes |
| --- | --- | --- | --- | --- |
| Provider profile | `/providers/[slug]` | `providers`, services, reviews, posts, verification | Yes | Highest value. Keep all published profiles indexable unless incomplete. |
| Category | `/providers/category/[slug]` | provider categories + provider inventory | Yes | Needs category-specific content blocks. |
| Location | `/providers/in/[location]` | provider cities | Yes if inventory exists | Needs city-specific content and top categories. |
| Category-location | `/providers/category/[slug]/in/[location]` | category + location + provider inventory | Conditional | Only index if provider count and content uniqueness pass gates. |
| Service type | `/providers/service/[slug]` | service titles | Conditional | Service titles can be messy; consolidate duplicates. |
| Top-rated city | `/providers/top-rated/[location]` | review/profile quality ranking | Conditional | Must explain ranking method. Avoid "best" without transparent criteria. |
| Service detail | `/services/[id]` | provider services + packages | Yes | Add schema and richer summaries. |
| Search/filter | `/search?...`, `/services?...` | query params | No | Useful UX pages, not primary SEO pages. |

## Quality Gates

Apply before an indexable page is created or added to sitemap.

| Gate | Threshold | Action |
| --- | --- | --- |
| Published providers | 3+ for category-city pages | Below threshold: noindex or route to broader category/city page. |
| Unique visible copy | 40%+ unique against same template set | Below threshold: add category/city-specific data or noindex. |
| Word count | 300+ words for priority indexable landing pages | Below threshold: noindex until expanded. |
| Provider cards | 3+ meaningful listings | Below threshold: show broader alternatives and noindex. |
| Internal links | 3-5 relevant links per 1000 words | Add category, city, service, provider, pricing, verification links. |
| Schema | Breadcrumb + relevant entity/list schema | Add before sitemap inclusion. |
| Human review | 5-10% sample per batch | Required before scaling beyond 50-100 pages. |

Hard stop:

- Do not publish 500+ new programmatic URLs without explicit quality review.
- Do not publish category-location pages where only the city/category token changes.
- Do not publish empty or near-empty result pages as indexable pages.

Google warns that using automation or similar tools to generate many low-value pages can violate scaled content abuse policies. It also flags third-party content published mainly to exploit a host site's ranking signals as site reputation abuse.

Sources:

- https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- https://developers.google.com/search/docs/essentials/spam-policies
- https://developers.google.com/search/blog/2024/11/site-reputation-abuse

## Recommended Indexation Rules

### Always index

- `/`
- `/search`
- `/services`
- `/about`
- `/dpm`
- `/how-it-works`
- `/verification`
- `/pricing`
- `/get-listed`
- `/why-servicepros`
- `/platform-partners`
- `/referral-agents`
- complete provider profiles
- published service detail pages

### Conditionally index

- category-location pages
- service type pages
- top-rated city pages
- location pages with limited inventory

### Noindex by default

- checkout
- auth
- account/dashboard
- claim flows
- policy pages if the strategy is legal clarity over acquisition
- search filters
- price filters
- sort URLs
- page 2+ if not using self-canonical pagination

## Template Blueprint: Category-Location Pages

```txt
H1: {Category} providers in {City}
Intro: Direct answer in 40-60 words
H2: Compare {category} providers in {city}
Provider list/cards
H2: Common {category} services in {city}
Dynamic list from actual services
H2: How to choose a {category} provider in {city}
Checklist with category-specific tips
H2: Verification and reviews to check
Trust explanation linked to /verification
H2: Related searches
Links to category, city, adjacent categories, nearby cities
```

Dynamic requirements:

- provider count
- average/price range when real data is enough
- top service titles in this category-city pair
- available verification badge counts
- recent provider activity if available

## Template Blueprint: Service Type Pages

```txt
H1: {Service} services in South Africa
Intro: What this service page includes
H2: Providers offering {service}
Service/provider cards
H2: Typical {service} packages
Dynamic package examples
H2: What to check before booking {service}
Trust and scope checklist
H2: Related services
Internal links
```

Governance note: service titles entered by providers should be normalized before creating long-tail pages. For example, "Logo Design", "logo design service", and "logo designs" should consolidate to one slug.

## Rollout Plan

### Batch 1: Foundation

- Fix sitemap coverage.
- Fix pagination canonicals/noindex.
- Add schema helpers.
- Define page quality gates in code comments or docs.

### Batch 2: Highest-value pages

- 10 category-city pages with strongest inventory.
- 5 service type pages with clean data.
- 5 top-rated city pages with transparent methodology.

### Batch 3: Scale slowly

- Release 50-100 pages at a time.
- Monitor indexing, impressions, clicks, and conversions for 2-4 weeks.
- Expand only templates with engagement and clean indexation.

## Measurement

Track:

- number of intended indexable pages
- number of submitted sitemap URLs
- number of indexed URLs
- pages excluded by `noindex`
- pages crawled but not indexed
- organic impressions per page family
- bookings/provider signups by landing page family

## Implementation Backlog

1. Add a reusable `seo_index_policy` function for page families.
2. Add inventory thresholds before rendering indexable category-city pages.
3. Add self-canonical pagination or `noindex,follow` for page 2+.
4. Normalize service titles into canonical service slugs.
5. Add sitemap generation for qualified category-location, service type, top-rated city, and service detail pages.
6. Add a monthly script/report for thin pages, duplicate slugs, and empty inventory pages.

