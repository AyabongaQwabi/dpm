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

export function defaultOpenGraph(
  title: string,
  description: string,
  path = '/',
): NonNullable<Metadata['openGraph']> {
  return {
    type: 'website',
    locale: 'en_ZA',
    url: canonicalUrl(path),
    siteName: SITE_NAME,
    title,
    description,
    images: [DEFAULT_OG_IMAGE],
  }
}

export function defaultTwitter(title: string, description: string): NonNullable<Metadata['twitter']> {
  return {
    card: 'summary_large_image',
    title,
    description,
    images: [DEFAULT_OG_IMAGE.url],
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
