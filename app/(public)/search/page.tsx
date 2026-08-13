// Search and listing page (PRD Section 10, DISC-001/002/003).
// Server-rendered for SEO. Filtering by type, tags, and free text.
// Ranking via lib/search.ts → lib/domain/ranking.ts.

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant'
import { searchProviders } from '@/lib/search'
import { loadPlatformConfig } from '@/lib/platform-config'
import { ProviderCardCompact } from '@/components/ProviderCard'
import { NameSearchBar } from '@/components/NameSearchBar'
import { SearchFilters } from '@/components/SearchFilters'
import { Pagination } from '@/components/Pagination'
import { JsonLd } from '@/components/seo/JsonLd'
import { FunnelEventTracker } from '@/components/analytics/FunnelEventTracker'
import {
  breadcrumbJsonLd,
  canonicalAlternates,
  defaultOpenGraph,
  defaultTwitter,
  providerListJsonLd,
} from '@/lib/seo'

interface SearchPageProps {
  searchParams: Promise<{ q?: string; type?: string; tags?: string; page?: string }>
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams
  const query = params.q?.trim() ?? ''
  const typeSlug = params.type ?? ''
  const tagFilter = params.tags ? params.tags.split(',').filter(Boolean) : []
  const page = Math.max(1, Number(params.page) || 1)
  const hasFilters = Boolean(query || typeSlug || tagFilter.length)

  const pathParts = ['/search']
  const urlParams = new URLSearchParams()
  if (query) urlParams.set('q', query)
  if (typeSlug) urlParams.set('type', typeSlug)
  if (tagFilter.length) urlParams.set('tags', tagFilter.join(','))
  const qs = urlParams.toString()
  const path = qs ? `${pathParts[0]}?${qs}` : pathParts[0]
  const isIndexable = !hasFilters && page === 1

  let title = 'Search South African service providers'
  let description =
    'Search verified South African service providers by name, category, or tag. Compare profiles, reviews, and services in one place.'

  if (query) {
    title = `Providers matching "${query}" in South Africa`
    description = `Find trusted South African providers matching "${query}". Filter by type and tags, compare reviews, and book services.`
  } else if (typeSlug) {
    const label = typeSlug.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
    title = `${label} providers in South Africa`
    description = `Browse ${label.toLowerCase()} providers across South Africa. Compare services, ratings, and locations on ServicePros.`
  }

  return {
    title,
    description,
    alternates: canonicalAlternates(isIndexable ? path : '/search'),
    openGraph: defaultOpenGraph(title, description, path),
    twitter: defaultTwitter(title, description),
    robots: isIndexable ? undefined : { index: false, follow: true },
  }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const supabase = await createClient()
  const [tenant, params] = await Promise.all([getTenantContext(), searchParams])

  const query = params.q?.trim() ?? ''
  const typeSlug = params.type ?? ''
  const tagFilter = params.tags ? params.tags.split(',').filter(Boolean) : []
  const page = Math.max(1, Number(params.page) || 1)

  const config = await loadPlatformConfig()

  let ptQuery = supabase
    .from('provider_types')
    .select('slug, name')
    .order('name', { ascending: true })
  if (tenant.categoryId) ptQuery = ptQuery.eq('category_id', tenant.categoryId)

  const [searchPage, { data: providerTypes }, { data: allTags }] = await Promise.all([
    searchProviders({
      categoryId: tenant.categoryId,
      query: query || undefined,
      providerTypeSlug: typeSlug || undefined,
      tagNames: tagFilter.length > 0 ? tagFilter : undefined,
      config,
      page,
      pageSize: 24,
    }),
    ptQuery,
    supabase.from('tags').select('name').order('name', { ascending: true }).limit(50),
  ])

  const { results, total, totalPages } = searchPage

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
    googleRating: r.googleRating,
    googleRatingCount: r.googleRatingCount,
    locationCity: r.locationCity,
    businessType: r.businessType,
    verification: r.verification,
  }))

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <FunnelEventTracker
        eventType="search_performed"
        category={typeSlug || null}
        dedupeKey={`${query}:${typeSlug}:${tagFilter.join(',')}:${page}`}
      />
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Providers', path: '/search' },
          ]),
          providerListJsonLd(
            query ? `Search results for "${query}"` : 'South African service providers',
            cards.map((p) => ({ slug: p.slug, id: p.id, business_name: p.business_name })),
          ),
        ]}
      />
      <h1 className="text-3xl font-bold tracking-tight mb-3">
        {tenant.branding?.siteName ? `${tenant.branding.siteName} providers` : 'Find a provider'}
      </h1>
      <p className="mb-4 max-w-2xl text-muted-foreground">
        Search by provider name, or use filters to browse by type and tag.
      </p>

      <NameSearchBar query={query} typeSlug={typeSlug} tagFilter={tagFilter} />

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
              <p className="text-sm text-muted-foreground mb-4">{total} provider{total === 1 ? '' : 's'} found</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cards.map((p) => (
                  <ProviderCardCompact key={p.id} provider={p} />
                ))}
              </div>
              <Pagination
                page={page}
                totalPages={totalPages}
                hrefForPage={(p) => {
                  const urlParams = new URLSearchParams()
                  if (query) urlParams.set('q', query)
                  if (typeSlug) urlParams.set('type', typeSlug)
                  if (tagFilter.length) urlParams.set('tags', tagFilter.join(','))
                  if (p > 1) urlParams.set('page', String(p))
                  const qs = urlParams.toString()
                  return qs ? `/search?${qs}` : '/search'
                }}
              />
            </>
          )}
        </section>
      </div>
    </main>
  )
}
