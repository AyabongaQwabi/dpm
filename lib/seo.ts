import type { Metadata } from 'next'

export const SITE_URL = 'https://servicepros.co.za'
export const SITE_NAME = 'ServicePros'
export const PUBLISHER = 'Namoota Technology'

export const DEFAULT_OG_IMAGE = {
  url: '/images/og-default.png',
  width: 1200,
  height: 630,
  alt: 'ServicePros — trusted South African service providers',
} as const

export const DEFAULT_DESCRIPTION =
  'Find, compare and hire trusted South African service providers. Browse verified profiles, reviews, and services from Cape Town to Joburg.'

/** Page-specific OG images — see docs/seo/SEO-IMAGE-ASSET-PLAN.md. */
export const PAGE_OG_IMAGES = {
  dpm: {
    url: '/images/seo/dpm-directory-provider-marketplace-1200x630.webp',
    width: 1200,
    height: 630,
    alt: 'ServicePros Directory and Provider Marketplace interface showing provider profiles, categories, booking, and verification signals.',
  },
  verification: {
    url: '/images/seo/servicepros-verification-badges-1200x630.webp',
    width: 1200,
    height: 630,
    alt: 'ServicePros verification badge examples showing contact, Google, CIPC, and FICA trust signals on provider profiles.',
  },
  pricing: {
    url: '/images/seo/servicepros-credits-pricing-1200x630.webp',
    width: 1200,
    height: 630,
    alt: 'ServicePros credits and pricing interface showing a customer wallet, credit packs, and a service booking summary.',
  },
  getListed: {
    url: '/images/seo/get-listed-service-provider-south-africa-1200x630.webp',
    width: 1200,
    height: 630,
    alt: 'ServicePros provider onboarding screen showing profile setup, services, verification, and booking tools.',
  },
  platformPartners: {
    url: '/images/seo/servicepros-platform-partners-1200x630.webp',
    width: 1200,
    height: 630,
    alt: 'ServicePros platform partner ecosystem connecting providers with specialist business support services.',
  },
} as const satisfies Record<string, { url: string; width: number; height: number; alt: string }>

/** Build an absolute canonical URL for a site path. */
export function canonicalUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (normalized === '/') return SITE_URL
  return `${SITE_URL}${normalized}`
}

export function canonicalAlternates(path: string): Metadata['alternates'] {
  return { canonical: canonicalUrl(path) }
}

/** Quality-gate thresholds for programmatic page families — see docs/seo/PROGRAMMATIC-SEO-GOVERNANCE.md. */
export const SEO_INDEX_THRESHOLDS = {
  /** Minimum published providers for a category-location page to be indexable. */
  categoryLocationMinProviders: 3,
  /** Minimum matching services for a service-type page to be indexable. */
  serviceTypeMinServices: 2,
} as const

/**
 * Decide whether a programmatic listing page should be indexed, given its
 * live inventory count and the page family's threshold. Below threshold, the
 * page still renders (so it's reachable and useful) but is kept out of
 * search results until inventory grows.
 */
export function seoIndexPolicy(inventoryCount: number, minInventory: number): Metadata['robots'] {
  return inventoryCount >= minInventory ? undefined : { index: false, follow: true }
}

export function defaultOpenGraph(
  title: string,
  description: string,
  path = '/',
  image: { url: string; width: number; height: number; alt: string } = DEFAULT_OG_IMAGE,
): NonNullable<Metadata['openGraph']> {
  return {
    type: 'website',
    locale: 'en_ZA',
    url: canonicalUrl(path),
    siteName: SITE_NAME,
    title,
    description,
    images: [image],
  }
}

export function defaultTwitter(
  title: string,
  description: string,
  image: { url: string } = DEFAULT_OG_IMAGE,
): NonNullable<Metadata['twitter']> {
  return {
    card: 'summary_large_image',
    title,
    description,
    images: [image.url],
  }
}

export function providerListJsonLd(
  name: string,
  providers: Array<{ slug: string | null; id: string; business_name: string }>,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: providers.length,
    itemListElement: providers.slice(0, 20).map((provider, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: provider.business_name,
      url: canonicalUrl(`/providers/${provider.slug ?? provider.id}`),
    })),
  }
}

export function webSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

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

export function imageObjectJsonLd(image: {
  url: string
  width?: number
  height?: number
  caption?: string
  /** Accepted as an alias for `caption` so page-specific OG image constants (which use `alt`) can be passed directly. */
  alt?: string
}) {
  const caption = image.caption ?? image.alt
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    url: canonicalUrl(image.url),
    ...(image.width ? { width: image.width } : {}),
    ...(image.height ? { height: image.height } : {}),
    ...(caption ? { caption } : {}),
  }
}

export function offerCatalogJsonLd(catalog: {
  name: string
  path: string
  offers: Array<{
    name: string
    description?: string | null
    price?: number | null
    priceCurrency?: string
    url?: string
  }>
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: catalog.name,
    url: canonicalUrl(catalog.path),
    itemListElement: catalog.offers.map((offer) => ({
      '@type': 'Offer',
      name: offer.name,
      ...(offer.description ? { description: offer.description } : {}),
      ...(offer.price !== undefined && offer.price !== null ? { price: offer.price } : {}),
      priceCurrency: offer.priceCurrency ?? 'ZAR',
      ...(offer.url ? { url: canonicalUrl(offer.url) } : { url: canonicalUrl(catalog.path) }),
    })),
  }
}

export function serviceJsonLd(service: {
  title: string
  description: string
  path: string
  image?: string | null
  category?: string | null
  provider: {
    name: string
    path: string
    city?: string | null
    region?: string | null
    country?: string | null
  }
  packages: Array<{
    name: string
    description?: string | null
    price: number
  }>
  rating?: { value: number; count: number } | null
}) {
  const serviceUrl = canonicalUrl(service.path)
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${serviceUrl}#service`,
    name: service.title,
    description: service.description,
    url: serviceUrl,
    ...(service.image ? { image: canonicalUrl(service.image) } : {}),
    ...(service.category ? { category: service.category } : {}),
    areaServed: { '@type': 'Country', name: 'South Africa' },
    provider: {
      '@type': 'LocalBusiness',
      name: service.provider.name,
      url: canonicalUrl(service.provider.path),
      ...(service.provider.city || service.provider.region || service.provider.country
        ? {
            address: {
              '@type': 'PostalAddress',
              addressLocality: service.provider.city ?? undefined,
              addressRegion: service.provider.region ?? undefined,
              addressCountry: service.provider.country ?? 'ZA',
            },
          }
        : {}),
    },
    ...(service.rating && service.rating.count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(service.rating.value.toFixed(1)),
            reviewCount: service.rating.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    offers: service.packages.map((pkg) => ({
      '@type': 'Offer',
      name: pkg.name,
      ...(pkg.description ? { description: pkg.description } : {}),
      price: pkg.price,
      priceCurrency: 'ZAR',
      availability: 'https://schema.org/InStock',
      url: serviceUrl,
    })),
  }
}

export function organizationJsonLd(
  contactPoints: Array<{
    contactType: string
    email?: string
    telephone?: string
    areaServed?: string
  }>,
  details?: {
    legalName?: string
    telephone?: string
    address?: {
      streetAddress: string
      addressLocality: string
      addressRegion: string
      postalCode: string
      addressCountry?: string
    }
  },
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: PUBLISHER,
    url: SITE_URL,
    sameAs: [] as string[],
    ...(details?.legalName ? { legalName: details.legalName } : {}),
    ...(details?.telephone ? { telephone: details.telephone } : {}),
    ...(details?.address
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: details.address.streetAddress,
            addressLocality: details.address.addressLocality,
            addressRegion: details.address.addressRegion,
            postalCode: details.address.postalCode,
            addressCountry: details.address.addressCountry ?? 'ZA',
          },
        }
      : {}),
    contactPoint: contactPoints.map((point) => ({
      '@type': 'ContactPoint',
      contactType: point.contactType,
      ...(point.email ? { email: point.email } : {}),
      ...(point.telephone ? { telephone: point.telephone } : {}),
      areaServed: point.areaServed ?? 'ZA',
    })),
  }
}

export function contactPageJsonLd(path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: `Contact ${SITE_NAME}`,
    url: canonicalUrl(path),
  }
}

export function definedTermJsonLd(params: {
  path: string
  termName: string
  description: string
  inDefinedTermSetPath: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: params.termName,
    description: params.description,
    url: canonicalUrl(params.path),
    inDefinedTermSet: canonicalUrl(params.inDefinedTermSetPath),
  }
}

export function faqPageJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

/**
 * WebPage + ItemList schema for neutral comparison/model-education pages —
 * see docs/seo/COMPARISON-PAGES-SAFE-STRATEGY.md. Deliberately no `Product`
 * schema, since these pages describe unnamed third-party marketplace models,
 * not sellable products.
 */
export function comparisonPageJsonLd(params: {
  path: string
  name: string
  description: string
  criteria: string[]
}) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${canonicalUrl(params.path)}#webpage`,
      url: canonicalUrl(params.path),
      name: params.name,
      description: params.description,
      publisher: { '@type': 'Organization', name: PUBLISHER },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `${params.name} comparison criteria`,
      itemListElement: params.criteria.map((criterion, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: criterion,
      })),
    },
  ]
}

export function localBusinessJsonLd(provider: {
  business_name: string
  bio: string | null
  profile_image: string | null
  slug: string | null
  id: string
  location_city: string | null
  location_state: string | null
  location_country: string | null
  avgRating: number | null
  reviewCount: number
  categoryName?: string | null
}) {
  const profilePath = provider.slug ?? provider.id
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: provider.business_name,
    description: provider.bio ?? undefined,
    image: provider.profile_image ?? undefined,
    url: canonicalUrl(`/providers/${profilePath}`),
  }

  if (provider.location_city || provider.location_state || provider.location_country) {
    schema.address = {
      '@type': 'PostalAddress',
      addressLocality: provider.location_city ?? undefined,
      addressRegion: provider.location_state ?? undefined,
      addressCountry: provider.location_country ?? 'ZA',
    }
  }

  if (provider.categoryName) {
    schema.category = provider.categoryName
  }

  if (provider.avgRating !== null && provider.reviewCount > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(provider.avgRating.toFixed(1)),
      reviewCount: provider.reviewCount,
      bestRating: 5,
      worstRating: 1,
    }
  }

  return schema
}
