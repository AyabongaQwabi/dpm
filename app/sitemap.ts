import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getLocations } from '@/lib/public-data'
import { normalizeServiceTypeSlug } from '@/lib/domain/service-title'
import { SEO_INDEX_THRESHOLDS, SITE_URL } from '@/lib/seo'

export const revalidate = 3600

const MIN_CATEGORY_LOCATION_PROVIDERS = SEO_INDEX_THRESHOLDS.categoryLocationMinProviders
const MIN_SERVICE_TYPE_SERVICES = SEO_INDEX_THRESHOLDS.serviceTypeMinServices

function locationSlug(city: string) {
  return city.toLowerCase().replaceAll(' ', '-')
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/browse/cities`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/feed`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/services`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/get-listed`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/why-servicepros`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/how-it-works`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/verification`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/help`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/feature-requests`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/dpm`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/platform-partners`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/referral-agents`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ]

  const [{ data: providers }, { data: categories }, { data: services }, { data: categoryLocationProviders }, locations, { data: posts }] = await Promise.all([
    supabase
      .from('providers')
      .select('slug, id, updated_at')
      .eq('is_published', true),
    supabase.from('provider_categories').select('slug, created_at'),
    supabase
      .from('services')
      .select('id, title, updated_at, providers!inner(is_published)')
      .eq('is_published', true)
      .eq('providers.is_published', true)
      .limit(1000),
    supabase
      .from('providers')
      .select('location_city, provider_types!inner(provider_categories!inner(slug))')
      .eq('is_published', true)
      .not('location_city', 'is', null)
      .limit(1000),
    getLocations(supabase, 200),
    // Posts only — never stories. Stories have no slug column and must
    // never appear here (noindex from the moment of publication).
    supabase
      .from('content_posts')
      .select('slug, updated_at, providers!inner(slug, id, is_published)')
      .eq('kind', 'post')
      .eq('status', 'published')
      .eq('moderation_status', 'passed')
      .eq('providers.is_published', true)
      .limit(2000),
  ])

  const providerRoutes: MetadataRoute.Sitemap = (providers ?? []).map((provider) => ({
    url: `${SITE_URL}/providers/${provider.slug ?? provider.id}`,
    lastModified: provider.updated_at ? new Date(provider.updated_at) : now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const categoryRoutes: MetadataRoute.Sitemap = (categories ?? []).map((category) => ({
    url: `${SITE_URL}/providers/category/${category.slug}`,
    lastModified: category.created_at ? new Date(category.created_at) : now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const locationRoutes: MetadataRoute.Sitemap = locations.map((location) => ({
    url: `${SITE_URL}/providers/in/${location.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const topRatedLocationRoutes: MetadataRoute.Sitemap = locations.map((location) => ({
    url: `${SITE_URL}/providers/top-rated/${location.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const postRoutes: MetadataRoute.Sitemap = (posts ?? [])
    .map((post) => {
      const provider = Array.isArray(post.providers) ? post.providers[0] : post.providers
      if (!provider || !post.slug) return null
      return {
        url: `${SITE_URL}/providers/${provider.slug ?? provider.id}/posts/${post.slug}`,
        lastModified: post.updated_at ? new Date(post.updated_at) : now,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }
    })
    .filter((route): route is NonNullable<typeof route> => route !== null)

  const serviceRoutes: MetadataRoute.Sitemap = (services ?? []).map((service) => ({
    url: `${SITE_URL}/services/${service.id}`,
    lastModified: service.updated_at ? new Date(service.updated_at) : now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const serviceTypeCounts = new Map<string, number>()
  for (const service of services ?? []) {
    const slug = normalizeServiceTypeSlug(service.title)
    if (!slug) continue
    serviceTypeCounts.set(slug, (serviceTypeCounts.get(slug) ?? 0) + 1)
  }

  const serviceTypeRoutes: MetadataRoute.Sitemap = [...serviceTypeCounts.entries()]
    .filter(([, count]) => count >= MIN_SERVICE_TYPE_SERVICES)
    .map(([slug]) => ({
      url: `${SITE_URL}/providers/service/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    }))

  type CategoryLocationProviderRow = {
    location_city: string | null
    provider_types?:
      | { provider_categories?: { slug: string } | { slug: string }[] | null }
      | { provider_categories?: { slug: string } | { slug: string }[] | null }[]
      | null
  }

  const categoryLocationCounts = new Map<string, { categorySlug: string; citySlug: string; count: number }>()
  for (const row of (categoryLocationProviders ?? []) as unknown as CategoryLocationProviderRow[]) {
    if (!row.location_city) continue
    const providerTypes = Array.isArray(row.provider_types)
      ? row.provider_types
      : row.provider_types
        ? [row.provider_types]
        : []

    for (const providerType of providerTypes) {
      const categories = Array.isArray(providerType.provider_categories)
        ? providerType.provider_categories
        : providerType.provider_categories
          ? [providerType.provider_categories]
          : []

      for (const category of categories) {
        if (!category.slug) continue
        const citySlug = locationSlug(row.location_city)
        const key = `${category.slug}:${citySlug}`
        const current = categoryLocationCounts.get(key)
        categoryLocationCounts.set(key, {
          categorySlug: category.slug,
          citySlug,
          count: (current?.count ?? 0) + 1,
        })
      }
    }
  }

  const categoryLocationRoutes: MetadataRoute.Sitemap = [...categoryLocationCounts.values()]
    .filter((combo) => combo.count >= MIN_CATEGORY_LOCATION_PROVIDERS)
    .map((combo) => ({
      url: `${SITE_URL}/providers/category/${combo.categorySlug}/in/${combo.citySlug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.75,
    }))

  return [
    ...staticRoutes,
    ...providerRoutes,
    ...categoryRoutes,
    ...locationRoutes,
    ...topRatedLocationRoutes,
    ...serviceRoutes,
    ...serviceTypeRoutes,
    ...categoryLocationRoutes,
    ...postRoutes,
  ]
}
