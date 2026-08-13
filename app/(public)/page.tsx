import type { Metadata } from 'next'
import { CategoryGrid } from '@/components/home/CategoryGrid'
import { FeaturedProviders } from '@/components/home/FeaturedProviders'
import { HeroSection } from '@/components/home/HeroSection'
import { RegionalBrowse } from '@/components/home/RegionalBrowse'
import { TrustSection } from '@/components/home/TrustSection'
import { RecommendedServices } from '@/components/home/RecommendedServices'
import { JsonLd } from '@/components/seo/JsonLd'
import { getCategories, getFeaturedProvidersWithSponsored, getLocations, getPublishedProviders } from '@/lib/public-data'
import { getRecommendedServices } from '@/lib/recommended-services'
import { createClient } from '@/lib/supabase/server'
import { canonicalAlternates, defaultOpenGraph, defaultTwitter, providerListJsonLd, webSiteJsonLd } from '@/lib/seo'
import { getTenantContext } from '@/lib/tenant'
import { InMemoryConfigStore } from '@/lib/domain/config'
import { filterVisibleTiles } from '@/lib/domain/browse'
import { MIN_TILE_PROVIDERS } from '@/lib/browse-config'

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

  const [categories, locations, recommendedServices] = await Promise.all([
    getCategories(supabase),
    getLocations(supabase),
    getRecommendedServices({ config, categorySlug: tenant.categorySlug, limit: 6 }),
  ])
  const visibleCategories = filterVisibleTiles(categories, MIN_TILE_PROVIDERS)

  const [{ providers: featured, verifiedPoolSize }, withCompleteProfile, recent] = await Promise.all([
    getFeaturedProvidersWithSponsored(supabase, visibleCategories, { limit: 6, categorySlug: tenant.categorySlug ?? undefined }),
    getPublishedProviders(supabase, { withCompleteProfile: true, limit: 6, categorySlug: tenant.categorySlug ?? undefined }),
    getPublishedProviders(supabase, { limit: 6, categorySlug: tenant.categorySlug ?? undefined }),
  ])

  if (verifiedPoolSize < 6) {
    // Data gap, not a code problem: too few verified providers exist to fill
    // the featured strip. Flag it loudly rather than silently backfilling
    // with unverified listings under a "Featured" label.
    console.warn(
      `[home] Featured strip: only ${verifiedPoolSize} verified providers available` +
        (tenant.categorySlug ? ` in category "${tenant.categorySlug}"` : '') +
        ` — strip may be under six providers or fall back to unverified listings.`,
    )
  }

  const siteName = tenant.branding?.siteName ?? 'Service Pros'
  // Verified providers spread across categories win; otherwise prefer
  // providers with a real photo + bio over an arbitrary recent scrape so the
  // section never shows an incomplete-looking listing (see
  // lib/public-data.ts withCompleteProfile). The unverified fallbacks below
  // are a stopgap for a thin verified pool, not the intended steady state.
  const providers = featured.length ? featured : withCompleteProfile.length ? withCompleteProfile : recent
  const totalProviders = visibleCategories.reduce((sum, c) => sum + c.providerCount, 0)
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
        data={[
          webSiteJsonLd(),
          providerListJsonLd(
            'Featured South African service providers',
            providers.map((p) => ({ slug: p.slug, id: p.id, business_name: p.business_name })),
          ),
        ]}
      />
      <HeroSection
        heading={heading}
        subheading={subheading}
        categories={visibleCategories}
        totalProviders={totalProviders}
        cityCount={cityCount}
      />
      <FeaturedProviders providers={providers} />
      <RecommendedServices services={recommendedServices} />
      <CategoryGrid categories={visibleCategories} />
      <RegionalBrowse locations={locations} />
      <TrustSection providerCount={totalProviders} categoryCount={visibleCategories.length} cityCount={cityCount} />
    </main>
  )
}
