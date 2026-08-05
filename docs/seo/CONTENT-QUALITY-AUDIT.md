# ServicePros SEO Content Quality Audit

Date: 2026-08-05
Skills used: seo-content, seo-authority-builder, seo-snippet-hunter

## Content Quality Score

Estimated score: 74/100.

The platform has strong functional content: users can search providers, inspect profiles, browse services, understand credits, compare pricing, read verification rules, and review policy pages. The main weakness is that many scalable SEO pages are structurally useful but text-light or template-generic.

## Strengths

- The site has clear public routes for search, services, provider profiles, categories, locations, pricing, verification, help, contact, and provider acquisition.
- The DPM definition is now consistent as "Directory and Provider Marketplace".
- Provider profile pages contain useful trust signals: services, reviews, verification, portfolio, posts, and location.
- The pricing page gives concrete credit mechanics: 1 credit equals R1, no expiry, top-up anytime.
- The provider proposition is specific: no pay-per-lead fees and commission only on completed, paid work.
- Help content is broad and organized around customer, provider, billing, and account concerns.

## Main Content Gaps

| Gap | Impact | Priority |
| --- | --- | --- |
| Thin category/location pages | Limits ranking for local service searches | P1 |
| Missing service detail schema/content summary | Weakens rich results and AI extraction | P1 |
| Contact page TODOs | Weakens trust and conversion | P1 |
| Little locally specific content on city pages | Makes pages feel interchangeable | P1 |
| No original marketplace data blocks | Reduces authority and citation appeal | P2 |
| No author/reviewer/date signals on guides | Reduces E-E-A-T clarity | P2 |
| Provider acquisition content is spread across pages | Needs clearer hub-and-spoke structure | P2 |
| Help FAQ schema may not produce Google rich results | Expectations need calibration | P3 |

## Page-Level Recommendations

### Home

Current role: marketplace front door.

Recommended additions:

- Add a concise definition block for what ServicePros is.
- Add direct links to the strongest category-city pages once inventory is known.
- Add a marketplace snapshot using real counts: providers, cities, categories, verified profiles.

Snippet-ready copy:

```txt
ServicePros is a South African service provider marketplace where customers can find, compare, and book local providers. Listings include provider profiles, services, reviews, locations, and verification signals to help customers choose with more confidence.
```

### Category pages

Current role: category discovery.

Recommended additions:

- Add category-specific introduction beyond the current template.
- Show common service types in that category.
- Add "How to compare providers in this category".
- Add related city links with actual inventory.

Template:

```txt
{Category} providers on ServicePros offer services such as {service examples}. Compare providers by location, profile completeness, reviews, verification status, recent work, and listed prices before sending an enquiry or booking.
```

### Location pages

Current role: city discovery.

Recommended additions:

- Add a local intro for the city.
- Show top categories in the city based on real provider counts.
- Add "Popular services in {City}".
- Add links to nearby locations if the platform has inventory.

### Category-city pages

Current role: highest-value SEO landing pages.

Recommended additions:

- Add city-specific and category-specific intro.
- Add comparison criteria.
- Add service examples from real listings.
- Add FAQ-style visible questions without relying on FAQ rich results.
- Add internal links to category, city, and related service pages.

Minimum content target:

- 350-600 words for priority category-city pages.
- 150-250 words for long-tail pages until there is enough inventory.

### Service detail pages

Current role: transaction detail.

Recommended additions:

- Add a one-screen summary of provider, city, price range, package count, and verification.
- Add "What is included" from package data.
- Add "Before you book" trust and refund/credit notes.
- Add `Service`, `Offer`, `Review`, and `BreadcrumbList` schema.

### Pricing

Current role: customer credit education.

Recommended additions:

- Add a short direct answer near top: "What is a ServicePros credit?"
- Add structured comparison of credit purchase, spend, refund, and expiry.
- Add provider commission link block if the page remains the central pricing route for both customers and providers.

### Verification

Current role: trust explainer.

Recommended additions:

- Keep badge explanations clear and non-overpromising.
- Add examples of what a customer should still check even when a provider is verified.
- Add last updated date and owner.

### Platform partners

Current role: partner acquisition and commercial terms.

Recommended additions:

- Add a concise answer to "What is a ServicePros platform partner?"
- Add visible eligibility criteria.
- Add example partner service categories.
- Add partner term summary: paid services, package coupons, scopes before publishing, payout review.

## Content System Improvements

1. Create reusable "SEO intro" content per category

Store category intros in data rather than repeating generic copy in components.

Fields:

- category summary
- common jobs
- how to choose
- verification notes
- related categories

2. Create reusable city content

Fields:

- city summary
- top categories
- nearby areas
- local trust note

3. Add inventory-aware content

Only create indexable landing pages when the page has enough real providers or a valuable acquisition purpose. Empty or near-empty pages should be noindexed or redirected to broader useful hubs.

4. Add content review metadata

Every SEO landing or guide page should have:

- owner
- last updated date
- data source notes
- legal/trust review state where applicable

## Editorial Standards

- Say what the page does in the first 1-2 sentences.
- Prefer concrete platform mechanics over broad claims.
- Avoid "best" unless the ranking methodology is visible.
- Do not publish legal, contact, refund, verification, or partner claims with unresolved TODOs.
- Use South African terminology and currency consistently: Rands, ZAR, CIPC, FICA, POPIA.
- Use `ServicePros` consistently; avoid `Service Pros` in visible public copy unless intentionally branded that way.

## AI Citation Improvements

AI systems need clean, extractable answers. Add:

- definition blocks
- tables for badges/pricing/comparisons
- short step-by-step processes
- source/date notes for data claims
- stable canonical URLs
- descriptive page titles and H1s

Best candidate pages for AI citations:

- `/dpm`
- `/verification`
- `/pricing`
- `/how-it-works`
- `/get-listed`
- `/why-servicepros`

