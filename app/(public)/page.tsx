import type { Metadata } from 'next'
import { CategoryGrid } from '@/components/home/CategoryGrid'
import { FeaturedProviders } from '@/components/home/FeaturedProviders'
import { HeroSection } from '@/components/home/HeroSection'
import { RegionalBrowse } from '@/components/home/RegionalBrowse'
import { TrustSection } from '@/components/home/TrustSection'
import { RecommendedServices } from '@/components/home/RecommendedServices'
import { JsonLd } from '@/components/seo/JsonLd'
import { getCategories, getLocations, getPublishedProviders } from '@/lib/public-data'
import { getRecommendedServices } from '@/lib/recommended-services'
import { createClient } from '@/lib/supabase/server'
import { canonicalAlternates, defaultOpenGraph, defaultTwitter, providerListJsonLd } from '@/lib/seo'
import { getTenantContext } from '@/lib/tenant'
import { InMemoryConfigStore } from '@/lib/domain/config'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Find trusted local providers in South Africa',
  description:
    'Search and compare verified South African providers — events, cleaning, security, legal and more — from Cape Town to Joburg, township to suburb.',
  alternates: canonicalAlternates('/'),
  openGraph: defaultOpenGraph(
    'Find trusted local providers in South Africa',
    'Search and compare verified South African providers — events, cleaning, security, legal and more — from Cape Town to Joburg.',
    '/',
  ),
  twitter: defaultTwitter(
    'Find trusted local providers in South Africa',
    'Search and compare verified South African providers — events, cleaning, security, legal and more.',
  ),
}

const RECOMMENDATION_DEFAULTS: Record<string, number> = {
  min_reviews_for_recommendation: 5,
  recommendation_weight_recency_rating: 0.35,
  recommendation_weight_booking_volume: 0.25,
  recommendation_weight_reliability: 0.25,
  recommendation_weight_review_ratio: 0.15,
  recommendation_recency_half_life_days: 180,
}

export default async function LandingPage() {
  const supabase = await createClient()
  const tenant = await getTenantContext()

  const { data: configRows } = await supabase.from('platform_config').select('key, value')
  const config = new InMemoryConfigStore({
    ...RECOMMENDATION_DEFAULTS,
    ...Object.fromEntries((configRows ?? []).map((r) => [r.key, r.value])),
  })

  const [featured, recent, categories, locations, recommendedServices] = await Promise.all([
    getPublishedProviders(supabase, { featured: true, limit: 6, categorySlug: tenant.categorySlug ?? undefined }),
    getPublishedProviders(supabase, { limit: 6, categorySlug: tenant.categorySlug ?? undefined }),
    getCategories(supabase),
    getLocations(supabase),
    getRecommendedServices({ config, categorySlug: tenant.categorySlug, limit: 6 }),
  ])

  const siteName = tenant.branding?.siteName ?? 'Service Pros'
  const providers = featured.length ? featured : recent
  const totalProviders = categories.reduce((sum, c) => sum + c.providerCount, 0)
  const cityCount = locations.length

  const heading = tenant.isHomeMarketplace
    ? 'Find someone local you can actually trust'
    : `Trusted ${siteName} providers, near you`
  const subheading = tenant.isHomeMarketplace
    ? 'From caterers in Soweto to armed response in Sandton — browse real South African businesses by category, city and rating. No middlemen, no guesswork.'
    : 'Browse vetted local businesses by city and rating. Real profiles, real reviews, real people.'

  return (
    <main>
      <JsonLd
        data={providerListJsonLd(
          'Featured South African service providers',
          providers.map((p) => ({ slug: p.slug, id: p.id, business_name: p.business_name })),
        )}
      />
      <HeroSection
        heading={heading}
        subheading={subheading}
        categories={categories}
        totalProviders={totalProviders}
        cityCount={cityCount}
      />
      <FeaturedProviders providers={providers} />
      <RecommendedServices services={recommendedServices} />
      <CategoryGrid categories={categories} />
      <RegionalBrowse locations={locations} />
      <TrustSection providerCount={totalProviders} categoryCount={categories.length} cityCount={cityCount} />
    </main>
  )
}
