# ServicePros Structured Data Report

Date: 2026-08-05
Skills used: seo-schema, seo-snippet-hunter, seo-geo

## Executive Summary

ServicePros already has a useful schema base: `Organization`, `ContactPage`, `DefinedTerm`, `FAQPage`, `ItemList`, and `LocalBusiness` builders exist in `lib/seo.ts`, and several public routes emit JSON-LD through `components/seo/JsonLd.tsx`.

The next gains come from filling missing high-intent schema on service detail, pricing, provider acquisition, and directory pages, plus enriching the existing organization and provider entities with verified trust fields.

Schema health score: 76/100.

## Current Schema Inventory

| Page or template | Current schema | Status | SEO impact |
| --- | --- | --- | --- |
| `/` | `ItemList` for featured providers | Good | Helps search engines understand the marketplace inventory. |
| `/dpm` | `DefinedTerm` plus article-like graph | Good | Strong entity definition for "Directory & Provider Marketplace". |
| `/about` | Organization/about-style JSON-LD | Good | Supports entity understanding, but needs richer Organization fields. |
| `/contact` | `Organization`, `ContactPage` | Needs cleanup | Visible contact TODOs weaken trust until confirmed. |
| `/help` | `FAQPage` | Mixed | Useful for machine parsing, but Google FAQ rich results are now restricted mostly to government and health sites. |
| `/providers/[slug]` | `LocalBusiness` | Good | Highest-value existing schema; needs richer verified fields where available. |
| `/providers/category/[slug]` | `ItemList` | Good | Useful for directory pages. |
| `/providers/in/[location]` | `ItemList` | Good | Useful for local discovery. |
| `/providers/category/[slug]/in/[location]` | `ItemList` | Good | Useful for long-tail local service pages. |
| `/providers/top-rated/[location]` | None found | Gap | Add `ItemList` plus `BreadcrumbList`. |
| `/providers/service/[slug]` | None found | Gap | Add `ItemList` plus `CollectionPage`. |
| `/services` | None found | Gap | Add `CollectionPage` or `ItemList` for visible service listings. |
| `/services/[id]` | None found | High-priority gap | Add `Service`, `Offer`, `Review`, and `BreadcrumbList`. |
| `/pricing` | None found | Gap | Add `OfferCatalog` for credit packs and FAQ-style visible Q&A if retained. |
| `/get-listed` | None found | Gap | Add `WebPage`, `Offer`, and provider onboarding steps. |
| `/verification` | None found | Gap | Add `WebPage` with trust policy content, not `Certification` unless a formal third-party certification exists. |
| `/platform-partners` | None found | Gap | Add `WebPage` and `OfferCatalog` for partner service terms when final. |

## Priority Fixes

1. Add Service schema to `/services/[id]`

Use this for published services with packages/prices. Connect the service to the provider entity and expose package prices as offers.

```ts
export function serviceJsonLd(service: {
  id: string
  title: string
  description: string
  url: string
  image?: string | null
  provider: { name: string; url: string; city?: string | null; category?: string | null }
  packages: Array<{ name: string; description: string; price: number }>
  rating?: { value: number; count: number } | null
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${service.url}#service`,
    name: service.title,
    description: service.description,
    image: service.image ?? undefined,
    url: service.url,
    provider: {
      '@type': 'LocalBusiness',
      name: service.provider.name,
      url: service.provider.url,
      address: service.provider.city
        ? { '@type': 'PostalAddress', addressLocality: service.provider.city, addressCountry: 'ZA' }
        : undefined,
    },
    areaServed: { '@type': 'Country', name: 'South Africa' },
    category: service.provider.category ?? undefined,
    aggregateRating: service.rating
      ? { '@type': 'AggregateRating', ratingValue: service.rating.value, reviewCount: service.rating.count }
      : undefined,
    offers: service.packages.map((pkg) => ({
      '@type': 'Offer',
      name: pkg.name,
      description: pkg.description,
      price: pkg.price,
      priceCurrency: 'ZAR',
      availability: 'https://schema.org/InStock',
      url: service.url,
    })),
  }
}
```

2. Add BreadcrumbList helper

Apply to provider profiles, category pages, location pages, service pages, DPM, pricing, verification, and partner pages.

```ts
export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  }
}
```

3. Enrich Organization schema

Current helper uses `PUBLISHER = 'Namoota Technology'` and an empty `sameAs`. Add confirmed values only:

```ts
{
  '@type': 'Organization',
  name: 'Namoota Technology',
  alternateName: 'ServicePros',
  url: 'https://servicepros.co.za',
  logo: 'https://servicepros.co.za/images/og-default.png',
  areaServed: { '@type': 'Country', name: 'South Africa' },
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@servicepros.co.za',
      areaServed: 'ZA',
      availableLanguage: ['en'],
    },
  ],
  sameAs: []
}
```

4. Add WebSite SearchAction on the homepage

```ts
{
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://servicepros.co.za/#website',
  name: 'ServicePros',
  url: 'https://servicepros.co.za',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://servicepros.co.za/search?q={search_term_string}',
    'query-input': 'required name=search_term_string'
  }
}
```

5. Add OfferCatalog to pricing

Use the live credit pack/config data. Keep package names, price, currency, and bonus credit information aligned with `lib/pricing-config.ts` and the credit pack data source.

```ts
{
  '@context': 'https://schema.org',
  '@type': 'OfferCatalog',
  name: 'ServicePros credit packs',
  url: 'https://servicepros.co.za/pricing',
  itemListElement: [
    {
      '@type': 'Offer',
      name: 'ServicePros credits',
      priceCurrency: 'ZAR',
      description: 'Credits used to pay for bookings on ServicePros. 1 credit equals R1.'
    }
  ]
}
```

## Validation Checklist

- Validate every generated JSON-LD object with Google Rich Results Test and Schema Markup Validator.
- Confirm each schema object represents visible page content.
- Use absolute canonical URLs only.
- Do not emit fake `aggregateRating`, reviews, phone numbers, addresses, logos, or `sameAs` links.
- Avoid adding FAQ schema solely for Google rich results; Google limits FAQ rich results primarily to authoritative government and health pages.
- Add `BreadcrumbList` consistently before expanding into more specialized types.

## Implementation Order

1. `lib/seo.ts`: add `breadcrumbJsonLd`, `serviceJsonLd`, `offerCatalogJsonLd`, and `webSiteJsonLd`.
2. `/services/[id]`: emit `Service` plus `BreadcrumbList`.
3. `/pricing`: emit `OfferCatalog`.
4. `/providers/top-rated/[location]` and `/providers/service/[slug]`: emit `ItemList` plus `BreadcrumbList`.
5. Provider profile: enrich `LocalBusiness` with verified `telephone`, `priceRange`, `areaServed`, `sameAs`, and `offers` when the data exists.
6. Organization: populate legal identity and contact fields after contact TODOs are confirmed.

