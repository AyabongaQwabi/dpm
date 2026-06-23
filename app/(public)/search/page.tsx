// Search and listing page (PRD Section 10, DISC-001/002/003).
// Server-rendered for SEO. Filtering by type, tags, and free text.
// Ranking via lib/search.ts → lib/domain/ranking.ts.

import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant'
import { searchProviders } from '@/lib/search'
import { InMemoryConfigStore } from '@/lib/domain/config'
import { ProviderCardCompact } from '@/components/ProviderCard'
import { SearchFilters } from '@/components/SearchFilters'

interface SearchPageProps {
  searchParams: Promise<{ q?: string; type?: string; tags?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const supabase = await createClient()
  const [tenant, params] = await Promise.all([getTenantContext(), searchParams])

  const query = params.q?.trim() ?? ''
  const typeSlug = params.type ?? ''
  const tagFilter = params.tags ? params.tags.split(',').filter(Boolean) : []

  // Default ranking config so search works even when platform_config rows are
  // absent. Any matching DB row overrides the corresponding default below.
  const RANKING_DEFAULTS: Record<string, number> = {
    ranking_weight_text_match: 0.3,
    ranking_weight_location: 0.15,
    ranking_weight_tags: 0.15,
    ranking_weight_review_quality: 0.2,
    ranking_weight_completed_bookings: 0.1,
    ranking_weight_profile_completeness: 0.1,
    ranking_weight_reliability_penalty: 0.5,
    ranking_boost_cap: 2,
    ranking_reliability_penalty_threshold: 0.5,
    ranking_near_zero_threshold: 0.05,
  }

  const { data: configRows } = await supabase.from('platform_config').select('key, value')
  const config = new InMemoryConfigStore({
    ...RANKING_DEFAULTS,
    ...Object.fromEntries((configRows ?? []).map((r) => [r.key, r.value])),
  })

  let ptQuery = supabase
    .from('provider_types')
    .select('slug, name')
    .order('name', { ascending: true })
  if (tenant.categoryId) ptQuery = ptQuery.eq('category_id', tenant.categoryId)

  const [results, { data: providerTypes }, { data: allTags }] = await Promise.all([
    searchProviders({
      categoryId: tenant.categoryId,
      query: query || undefined,
      providerTypeSlug: typeSlug || undefined,
      tagNames: tagFilter.length > 0 ? tagFilter : undefined,
      config,
      limit: 50,
    }),
    ptQuery,
    supabase.from('tags').select('name').order('name', { ascending: true }).limit(50),
  ])

  // Map SearchResult → ProviderCardData
  const cards = results.map((r) => ({
    id: r.providerId,
    slug: r.slug,
    business_name: r.businessName,
    bio: r.bio,
    profile_image: r.profileImage,
    providerTypeName: r.providerTypeName,
    tags: r.tags,
    avgRating: r.avgRating,
    locationCity: r.locationCity,
    businessType: r.businessType,
    verification: r.verification,
  }))

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight mb-3">
        {tenant.branding?.siteName ? `${tenant.branding.siteName} providers` : 'Find a provider'}
      </h1>
      <p className="mb-8 max-w-2xl text-muted-foreground">
        Search across published providers, then narrow by provider type or tag.
      </p>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* Filter sidebar */}
        <aside className="lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
          <SearchFilters
            query={query}
            typeSlug={typeSlug}
            tagFilter={tagFilter}
            providerTypes={(providerTypes ?? []).map((pt) => ({ slug: pt.slug, name: pt.name }))}
            tags={(allTags ?? []).map((t) => t.name)}
          />
        </aside>

        {/* Results */}
        <section className="flex-1">
          {cards.length === 0 ? (
            <p className="text-muted-foreground">No providers found. Try adjusting your filters.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">{cards.length} providers found</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cards.map((p) => (
                  <ProviderCardCompact key={p.id} provider={p} />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
