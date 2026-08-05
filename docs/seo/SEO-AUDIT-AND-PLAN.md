# ServicePros SEO and GEO Audit Plan

Generated: 5 August 2026

## Assumptions and Scope

- Site type: South African service-provider marketplace with local-service intent.
- Primary SEO goals: customer acquisition, provider acquisition, brand trust, and AI/search citation visibility.
- Target market and language: South Africa, English (`en-ZA`).
- Audit scope: local source-code audit of the Next.js App Router site plus competitor SERP context. No Google Search Console, analytics, logs, live PageSpeed, or production crawl data was available.
- Device scope: desktop and mobile readiness inferred from responsive source patterns; field Core Web Vitals were not measured.

## Evidence Sources

Local evidence came from:

- `app/robots.ts`
- `app/sitemap.ts`
- `app/layout.tsx`
- `lib/seo.ts`
- public route files under `app/(public)/`
- navigation/footer components

External market context:

- Snupit: https://www.snupit.co.za/
- Snupit About: https://www.snupit.co.za/about-us.aspx
- Snupit Pro FAQ: https://www.snupit.co.za/faq-pro.aspx
- Bark South Africa services: https://www.bark.com/en/za/services/
- Uptasker: https://uptasker.co.za/site/
- TaskSA: https://tasksa.co.za/
- Procompare: https://www.procompare.co.za/
- Procompare for Pros: https://www.procompare.co.za/pro-info-centre/success-tips/how-procompare-works
- Google sitemap guidance: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Google canonical guidance: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Google pagination guidance: https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading
- Google Organization structured data guidance: https://developers.google.com/search/docs/appearance/structured-data/organization
- Google helpful content guidance: https://developers.google.com/search/docs/fundamentals/creating-helpful-content

## Executive Summary

ServicePros has a credible SEO foundation: server-rendered public pages, centralized canonical helpers, metadata on key routes, a generated sitemap, robots rules, provider list JSON-LD, provider LocalBusiness JSON-LD, FAQPage schema on the help centre, and public pages for trust, verification, pricing, policies, and provider acquisition.

The biggest constraint is not crawlability failure. It is incomplete discovery and insufficient uniqueness for programmatic local pages. The app already has routes for category pages, location pages, category plus location pages, service pages, top-rated city pages, and provider profiles, but the sitemap and content depth do not fully support the long-tail search opportunity.

GEO readiness is promising because the site has answer-first pages like `/dpm`, FAQ schema on `/help`, and structured provider data. It still needs stronger quotable facts, richer local details, better entity/schema coverage, and authoritative references or public documents that AI search engines can cite.

## SEO Health Index

- Overall Score: 80 / 100
- Health Status: Good

The score reflects SEO readiness, not guaranteed rankings. It is limited mainly by sitemap coverage, paginated canonical handling, thin local/category page content, incomplete entity/trust signals, and lack of live GSC/CWV/analytics evidence.

| Category | Score | Weight | Weighted Contribution |
| --- | ---: | ---: | ---: |
| Crawlability & Indexation | 83 | 30 | 24.9 |
| Technical Foundations | 90 | 25 | 22.5 |
| On-Page Optimization | 78 | 20 | 15.6 |
| Content Quality & E-E-A-T | 72 | 15 | 10.8 |
| Authority & Trust Signals | 62 | 10 | 6.2 |
| Total |  |  | 80.0 |

## Findings

### F1. Sitemap does not include several public SEO routes

- Category: Crawlability & Indexation
- Evidence: `app/sitemap.ts` includes `/`, `/search`, `/feed`, `/services`, `/about`, `/get-listed`, `/pricing`, provider profiles, category pages, and location pages. It does not include `/dpm`, `/how-it-works`, `/why-servicepros`, `/verification`, `/help`, `/contact`, `/platform-partners`, `/referral-agents`, `/providers/top-rated/[location]`, `/providers/service/[slug]`, `/services/[id]`, or category plus location pages.
- Severity: High
- Confidence: High
- Why it matters: Sitemaps help search engines discover canonical URLs, especially dynamic and long-tail pages.
- Score impact: -10 to Crawlability & Indexation
- Recommendation: Expand sitemap generation to include all indexable static pages and selected high-value dynamic route families.

### F2. Paginated list pages canonicalize to the first page

- Category: Crawlability & Indexation
- Evidence: `generateMetadata` in category, location, category-location, top-rated, and search pages builds canonical URLs without `?page=n`; `components/Pagination.tsx` creates crawlable `?page=` links. Google pagination guidance says paginated pages should have unique URLs and should not canonicalize every page to page 1.
- Severity: Medium
- Confidence: High
- Why it matters: Later pages in paginated collections may be discovered but treated as duplicates, weakening discovery of providers beyond page 1.
- Score impact: -5 to Crawlability & Indexation
- Recommendation: Give each paginated page a self-referencing canonical, or deliberately `noindex,follow` deeper pages if the strategy is to concentrate ranking on first pages.

### F3. AI-specific robots rules allow auth entry pages

- Category: Crawlability & Indexation
- Evidence: `app/robots.ts` disallows `/sign-in`, `/sign-up`, `/provider-login`, and `/provider-signup` for `*`, but the more specific AI bot group only disallows account/dashboard/API/checkout paths.
- Severity: Low
- Confidence: High
- Why it matters: AI crawlers may spend crawl budget on low-value auth pages that are not useful citation targets.
- Score impact: -2 to Crawlability & Indexation
- Recommendation: Mirror the auth disallow rules in the AI bot group while keeping public informational pages open.

### F4. Category, city, and category-city landing pages are thin and mostly templated

- Category: On-Page Optimization
- Evidence: Category pages use generic text such as "Browse provider profiles, service offers, media, and reviews in this category." Location pages use generic text such as "Compare published provider profiles, services, reviews, and content from professionals serving {city}." Category-city pages use similarly generic copy.
- Severity: High
- Confidence: High
- Why it matters: Competitors target local and service intent with deeper pages. Generic pages are less likely to satisfy queries such as "cleaning services in Queenstown" or "wedding caterers in Cape Town".
- Score impact: -10 to On-Page Optimization
- Recommendation: Add unique local/service copy, FAQs, trust cues, and internal links for the top category-city combinations before scaling to every possible combination.

### F5. Search and filtered service URLs risk indexation noise

- Category: On-Page Optimization
- Evidence: `/search` can generate metadata and canonicals for query/type/tag filters, while pagination omits page from canonical. `/services` supports category, query, city, min, and max filters without explicit robots treatment in the inspected source.
- Severity: Medium
- Confidence: Medium
- Why it matters: Filter combinations can create many low-uniqueness URLs unless controlled by canonical/noindex rules.
- Score impact: -2.5 to On-Page Optimization
- Recommendation: Define which filters are indexable, canonicalize or noindex the rest, and favor clean landing routes for high-value combinations.

### F6. Provider LocalBusiness schema is useful but incomplete for local search

- Category: On-Page Optimization
- Evidence: `lib/seo.ts` emits `LocalBusiness` with name, description, image, URL, address fields, category, and aggregateRating when available. It does not emit telephone, priceRange, areaServed, openingHours, geo coordinates, sameAs, or service/offers data.
- Severity: Medium
- Confidence: High
- Why it matters: Complete local structured data improves entity clarity for search and AI systems.
- Score impact: -5 to On-Page Optimization
- Recommendation: Enrich provider schema when verified data exists, and avoid adding fields that are unverified or unavailable.

### F7. Service detail pages lack structured data for offers/services

- Category: On-Page Optimization
- Evidence: `/services/[id]/page.tsx` renders service packages and prices but does not emit `Service`, `Offer`, `Product`, `BreadcrumbList`, or provider-linked structured data.
- Severity: Medium
- Confidence: High
- Why it matters: Search engines and AI systems can better understand what is bookable, who provides it, and at what price when structured data mirrors page content.
- Score impact: -5 to On-Page Optimization
- Recommendation: Add `Service` plus `Offer` schema to service detail pages, and add breadcrumbs for provider/category/service relationships.

### F8. Programmatic local pages lack enough E-E-A-T and original local detail

- Category: Content Quality & E-E-A-T
- Evidence: The inspected list pages rely mostly on provider cards and generic explanatory text. The local-service template calls for unique city/service context, local proof, testimonials, regulations, or neighborhood detail on high-value location pages.
- Severity: High
- Confidence: High
- Why it matters: Helpful, reliable content needs original information and clear trust signals, especially for local service decisions.
- Score impact: -10 to Content Quality & E-E-A-T
- Recommendation: Build editorial modules for priority city/category pages: local buying guidance, verification explanation, review snippets, typical service packages, and provider-count statistics.

### F9. Contact page still contains visible TODO placeholders

- Category: Authority & Trust Signals
- Evidence: `app/(public)/contact/page.tsx` still renders `TodoPlaceholder` for responsible person, reason-specific inboxes, response time, Information Officer name, and Information Officer contact details.
- Severity: Medium
- Confidence: High
- Why it matters: Trust, supplier disclosure, and POPIA clarity are important for a marketplace handling accounts, payments, and disputes.
- Score impact: -5 to Authority & Trust Signals
- Recommendation: Replace placeholders with confirmed operational contacts or conservative interim routing through the configured support email.

### F10. Organization schema is sparse

- Category: Authority & Trust Signals
- Evidence: `organizationJsonLd` has `sameAs: []`, contact points, and publisher name, while the contact page has supplier details in visible HTML. Google recommends including useful organization properties such as address, telephone, URL, logo, and online presence where applicable.
- Severity: Medium
- Confidence: High
- Why it matters: Rich organization data helps search engines and AI systems resolve the ServicePros/Namoota entity cleanly.
- Score impact: -5 to Authority & Trust Signals
- Recommendation: Populate Organization schema with logo, legal name, address, telephone, and any confirmed social/profile URLs.

### F11. Competitor pages have clearer service-intent positioning and proof

- Category: Content Quality & E-E-A-T
- Evidence: Snupit positions itself around local professionals and quotes, and its about page states large-scale marketplace proof; Bark lists broad service coverage; TaskSA emphasizes booking, secure payment, and review flow; Procompare uses "up to 6 quotes" and provider lead-cost information.
- Severity: Medium
- Confidence: Medium
- Why it matters: ServicePros has a differentiated model, but key pages need to express that differentiation with more specific proof and comparison content.
- Score impact: -2.5 to Content Quality & E-E-A-T
- Recommendation: Add comparison-led content that explains "book and pay completed work, not pay-per-lead" across customer and provider acquisition pages.

### F12. No measured SEO performance data was available

- Category: Technical Foundations
- Evidence: No Google Search Console, analytics, log files, or live PageSpeed/Core Web Vitals data were provided in the repo context.
- Severity: Low
- Confidence: High
- Why it matters: Without field data, the audit can assess readiness but cannot validate index coverage, impressions, queries, ranking movement, crawl frequency, or real user performance.
- Score impact: -3 to Technical Foundations
- Recommendation: Connect Search Console, Bing Webmaster Tools, analytics, and performance monitoring before judging SEO outcomes.

## Prioritized Action Plan

### Critical Blockers

No critical blockers were directly observed. The site is not fundamentally blocked from crawling or indexing based on local source inspection.

Expected score recovery: 0 points, unless production data reveals hidden noindex, robots, redirect, or server errors.

### High-Impact Improvements

Related findings: F1, F2, F4, F6, F7, F8.

- Expand the sitemap to include all intentional indexable pages and high-value dynamic route families.
- Fix canonical strategy for paginated list pages.
- Add richer unique modules to top category, city, and category-city pages before broad programmatic scaling.
- Add Service/Offer/Breadcrumb schema on service detail pages.
- Enrich LocalBusiness schema for provider profiles where verified data exists.

Expected score recovery: +12 to +18 points.

### Quick Wins

Related findings: F3, F9, F10, F12.

- Mirror auth disallow rules in the AI bot robots group.
- Replace remaining contact-page TODO placeholders.
- Add logo/address/telephone to Organization JSON-LD.
- Set up Search Console, Bing Webmaster Tools, and submit sitemap.

Expected score recovery: +6 to +10 points.

### Longer-Term Opportunities

Related findings: F8, F11, F12.

- Create local service content clusters for priority categories and cities.
- Publish comparison content against pay-per-lead marketplaces without naming competitors unfairly.
- Build public educational assets or PDFs that explain ServicePros verification, pricing, and the Directory & Provider Marketplace category.
- Track AI citation visibility in ChatGPT, Perplexity, Google AI Overviews, Copilot/Bing, and Claude/Brave.

Expected score recovery: +5 to +10 points, plus stronger long-term ranking resilience.

## Strategic SEO Plan

### Positioning

Primary SEO thesis: ServicePros should rank as a South African directory and provider marketplace for finding, comparing, booking, paying, and reviewing trusted service providers. The provider-side thesis is that businesses pay for a real profile and completed-work commission, not speculative lead access.

Primary keyword families:

- "service providers South Africa"
- "[category] providers South Africa"
- "[category] services in [city]"
- "trusted [trade] in [city]"
- "book [service] in [city]"
- "get listed as a service provider"
- "service provider marketplace South Africa"
- "alternatives to pay per lead for service providers"

### Competitor Context

Snupit is the strongest visible local marketplace competitor and emphasizes scale, local professionals, quote requests, and a pay-per-lead provider model. Bark has broad service coverage in South Africa and pushes quote comparison. Uptasker and Procompare also frame the journey around getting quotes from reviewed providers. TaskSA is closer to ServicePros on transactional flow because it presents browsing, booking, payment, and reviews.

ServicePros should avoid trying to out-Snupit Snupit on generic lead-generation language. Its defensible angle is:

- real provider profiles rather than anonymous lead distribution
- booking and payment in one flow
- commission only on completed, paid work
- provider-controlled dashboards, services, content, verification, and partner support
- South African local-first trust signals

### Recommended Site Architecture

Keep current routes, but make the crawl strategy more deliberate:

```text
/
/search
/services
/services/[id]
/providers/[slug]
/providers/category/[category]
/providers/in/[city]
/providers/category/[category]/in/[city]
/providers/service/[service]
/providers/top-rated/[city]
/how-it-works
/verification
/pricing
/get-listed
/why-servicepros
/platform-partners
/referral-agents
/dpm
/help
/contact
/about
```

Quality gate for scaling:

- Start with 5 to 10 priority cities and 10 to 20 priority categories.
- Only index category-city combinations that have providers or strong editorial content.
- Noindex/filter canonicalize thin search combinations.
- Add content modules before opening hundreds of near-empty pages.

### Content Calendar

| Priority | Page/Topic | Intent | Notes |
| --- | --- | --- | --- |
| 1 | Cleaning services in Johannesburg | Customer transactional | Build model city/category page. |
| 1 | Caterers in Cape Town | Customer transactional | Good events category exemplar. |
| 1 | Security companies in Pretoria | Customer transactional | Add trust/verification copy. |
| 1 | Why completed-work commission beats pay-per-lead | Provider education | Strong ServicePros differentiator. |
| 2 | How ServicePros verification works | Trust | Expand existing page with FAQ schema. |
| 2 | How to choose a service provider in South Africa | Informational | Link to categories and city pages. |
| 2 | ServicePros vs lead marketplaces | Provider acquisition | Comparison-led, neutral wording. |
| 3 | Provider profile SEO guide | Provider success | Supports provider acquisition and partner services. |
| 3 | Booking safely with local providers | Customer trust | Tie into reviews, credits, disputes. |
| 3 | Directory & Provider Marketplace explained | GEO/entity | Expand `/dpm` with FAQ schema and citations. |

### Implementation Roadmap

#### Phase 1: Foundation

- Expand sitemap and canonical handling.
- Fix remaining contact/trust placeholders.
- Add Organization schema completeness.
- Add Service/Offer/Breadcrumb schema.
- Connect Search Console and Bing Webmaster Tools.

#### Phase 2: Expansion

- Build priority category-city content modules.
- Add FAQ schema to high-intent pages with visible FAQs.
- Add internal links from home/category/location pages to top combinations.
- Build provider-side comparison content around completed-work commission.

#### Phase 3: Scale

- Generate only quality-gated local pages.
- Add statistics modules from live provider/category/city counts.
- Add public trust assets, including verification and pricing explainers.
- Create public PDF resources for GEO citation surfaces.

#### Phase 4: Authority

- Build PR and local directory mentions.
- Encourage providers to link to their ServicePros profiles.
- Publish case studies and success stories.
- Track AI citations and refresh key content at least monthly.

## GEO Optimization Plan

### Current Strengths

- `/dpm` has answer-first category definition content.
- `/help` emits FAQPage schema.
- Provider profiles emit LocalBusiness schema.
- The site has a clear differentiator against lead marketplaces.

### Highest-Value GEO Improvements

- Add FAQPage schema to `/dpm`, `/how-it-works`, `/verification`, `/pricing`, `/get-listed`, and selected category-city pages where FAQs are visible.
- Add statistics to key pages using live counts: provider count, category count, city count, review count, verified provider count, and completed booking count when available.
- Add neutral citations or references for legal/policy pages and the DPM explainer where appropriate.
- Use short answer-first sections at the top of important pages.
- Host canonical public PDF explainers for ServicePros verification, provider pricing, and DPM category definition.
- Make robots rules explicitly allow useful AI bots while excluding account, dashboard, checkout, API, and auth pages.

### GEO Content Format

Use extractable paragraphs:

- "ServicePros is a Directory & Provider Marketplace in South Africa: customers can find, compare, book, pay, and review service providers in one place."
- "Providers do not pay to compete for leads on ServicePros. Commission is charged only on completed, paid work."
- "A provider profile can include services, packages, prices, gallery media, verification badges, reviews, and a booking flow."

## KPI Targets

Baselines require Search Console and analytics. Until then, use "not measured" rather than invented numbers.

| Metric | Baseline | 3 Month | 6 Month | 12 Month |
| --- | --- | --- | --- | --- |
| Organic Traffic | Not measured | Establish baseline and +25% from launch baseline | +75% from launch baseline | +200% from launch baseline |
| Keyword Rankings | Not measured | 20 tracked keywords in top 50 | 20 in top 20, 5 in top 10 | 50 in top 20, 15 in top 10 |
| Domain Authority | Not measured | Baseline established | +5 referring domains from relevant local/provider sites | +25 quality referring domains |
| Indexed Pages | Not measured | Core pages and provider profiles indexed | Priority category/city pages indexed | Quality-gated category-city pages indexed |
| Core Web Vitals | Not measured | Pass mobile CWV on key templates | Maintain pass during scale | Maintain pass across major templates |

## Limitations

- This score reflects SEO readiness, not guaranteed rankings.
- External factors such as competition, algorithm updates, domain age, and backlink profile are not fully scored.
- Authority score is directional because backlink, brand mention, GSC, and analytics data were not available.
- Production behavior may differ from source-code findings if environment variables, redirects, headers, or database content differ.
