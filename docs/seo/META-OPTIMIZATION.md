# ServicePros Meta Optimization Pack

Date: 2026-08-05
Skills used: seo-meta-optimizer, seo-keyword-strategist

## Meta Health

Meta score: 82/100.

The app has centralized defaults in `app/layout.tsx` and route-level metadata on most public pages. The main issues are inconsistent keyword targeting, a few generic titles, and missing page-specific Open Graph treatment on deep service pages.

Next.js title template note: most child `title` values render with `| ServicePros`, so recommended page titles below are written as the child title unless marked absolute.

## Recommended Meta Packages

| Route | Current focus | Recommended title | Recommended description |
| --- | --- | --- | --- |
| `/` | Broad marketplace | `Service Providers South Africa` | `Find, compare, and book trusted South African service providers. Browse verified profiles, reviews, services, and local providers near you.` |
| `/search` | Search discovery | `Find Service Providers in South Africa` | `Search trusted South African service providers by service, category, location, price, and verification status on ServicePros.` |
| `/services` | Bookable services | `Book Local Services in South Africa` | `Browse bookable services from South African providers. Compare prices, packages, reviews, and provider profiles before you book.` |
| `/services/[id]` | Individual service | `{Service Title}` | `{Short service description} Compare packages, pricing, reviews, and provider details before booking on ServicePros.` |
| `/providers/[slug]` | Provider profile | `{Business Name} in {City}` | `View {Business Name}'s services, reviews, recent work, verification status, and contact details on ServicePros.` |
| `/providers/category/[slug]` | Category directory | `{Category} Providers in South Africa` | `Find and compare {category} providers in South Africa by services, reviews, location, and verification status on ServicePros.` |
| `/providers/in/[location]` | Location directory | `Service Providers in {City}` | `Find trusted service providers in {City}. Compare profiles, services, reviews, and local provider posts on ServicePros.` |
| `/providers/category/[slug]/in/[location]` | Local category | `{Category} Providers in {City}` | `Compare {category} providers in {City}. Browse services, reviews, prices, and verified local profiles on ServicePros.` |
| `/providers/service/[slug]` | Service type | `{Service} Services in South Africa` | `Find providers offering {service} services in South Africa. Compare profiles, prices, locations, and reviews on ServicePros.` |
| `/providers/top-rated/[location]` | Local best-of | `Top-Rated Providers in {City}` | `Browse top-rated local providers in {City} by review quality, profile completeness, verification status, and services offered.` |
| `/get-listed` | Provider acquisition | `Get Listed as a Service Provider` | `Create a ServicePros provider profile, publish services, get found in local search, and pay commission only on completed work.` |
| `/pricing` | Customer credits | `ServicePros Credits and Pricing` | `Buy ServicePros credits to pay for bookings. 1 credit equals R1, credits do not expire, and you can top up anytime.` |
| `/why-servicepros` | Provider comparison | `Why ServicePros for Providers` | `See why South African providers choose ServicePros: no pay-per-lead fees, provider profiles, bookings, reviews, and commission only on completed work.` |
| `/verification` | Trust explainer | `How ServicePros Verification Works` | `Learn what ServicePros Contact, Google, CIPC, and FICA verification badges mean, and what each badge does and does not guarantee.` |
| `/platform-partners` | Partner acquisition | `Platform Partners for Service Providers` | `Partner with ServicePros to sell provider services, fulfil package perks, and support South African businesses through the marketplace.` |
| `/referral-agents` | Referral acquisition | `ServicePros Referral Agents` | `Help bring South African service providers onto ServicePros and earn from qualified provider referrals.` |
| `/dpm` | Entity definition | `DPM: Directory and Provider Marketplace` | `A DPM, or Directory and Provider Marketplace, helps customers discover providers, compare profiles, and book services in one platform.` |
| `/help` | Support | `ServicePros Help Centre` | `Get help with ServicePros bookings, credits, provider listings, verification, payments, refunds, reviews, and account questions.` |
| `/contact` | Trust/support | `Contact ServicePros` | `Contact ServicePros for customer support, provider support, billing, disputes, media, partnerships, and POPIA requests.` |

## Highest-Impact Changes

1. Make `/services/[id]` metadata more complete

Current metadata uses only title and a sliced description. Add provider, price range, city, and default Open Graph image fallback when data exists.

Recommended title pattern:

```txt
{Service Title} by {Provider Name}
```

Recommended description pattern:

```txt
Book {service title} from {provider name}{ in city}. Compare packages from {lowest price}, reviews, and provider details on ServicePros.
```

2. Make paginated metadata explicit

If paginated pages are indexable, append page numbers in titles and descriptions for `?page=2+` and use self-referencing canonicals.

```txt
{Category} Providers in {City} - Page 2
```

If they are not strategic, set `noindex,follow` on pages after page 1.

3. Separate indexable and non-indexable filters

Index these:

- `/providers/category/[slug]`
- `/providers/in/[location]`
- `/providers/category/[slug]/in/[location]`
- `/providers/service/[slug]`
- `/providers/top-rated/[location]`

Canonicalize or noindex these unless converted to clean landing pages:

- `/search?q=...`
- `/search?tag=...`
- `/services?q=...`
- `/services?min=...&max=...`
- arbitrary multi-filter combinations

4. Tune provider acquisition title language

The strongest provider-acquisition concept in the codebase is "no pay-per-lead fees". Use it consistently in `/get-listed`, `/why-servicepros`, and provider pricing snippets.

Recommended title variants:

- `Get Listed as a Service Provider`
- `No Pay-Per-Lead Fees for Providers`
- `ServicePros Provider Pricing`

## Open Graph Recommendations

- Add service-level image fallback for `/services/[id]`.
- Use provider profile images as OG images for `/providers/[slug]` when verified and high quality.
- Consider generated 1200x630 OG images for the DPM, verification, pricing, and platform partner pages.
- Keep OG title under about 60 characters and OG descriptions under about 155 characters.

## Metadata QA Checklist

- Each indexable page has one canonical URL.
- Dynamic metadata matches visible H1 and page intent.
- Titles do not duplicate the brand twice.
- Descriptions include a clear user action: find, compare, book, get listed, contact, or learn.
- No unresolved internal placeholder content appears in public trust, contact, legal, or metadata-facing pages.
