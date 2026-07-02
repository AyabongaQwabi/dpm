import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getLocations } from '@/lib/public-data'
import { SITE_URL } from '@/lib/seo'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/feed`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/services`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/get-listed`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
  ]

  const [{ data: providers }, { data: categories }, locations] = await Promise.all([
    supabase
      .from('providers')
      .select('slug, id, updated_at')
      .eq('is_published', true),
    supabase.from('provider_categories').select('slug, created_at'),
    getLocations(supabase, 200),
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

  return [...staticRoutes, ...providerRoutes, ...categoryRoutes, ...locationRoutes]
}
