// Signal assembly layer for provider search ranking.
// Translates raw Supabase query results into the RelevanceSignals shape that
// lib/domain/ranking.ts expects, without coupling ranking logic to DB types.
// Tech stack ARCH-013: Postgres full-text + pg_trgm for v1 text scoring.

import { createClient } from '@/lib/supabase/server'
import { rankProviders, type ScoredProvider } from '@/lib/domain/ranking'
import { type ConfigStore } from '@/lib/domain/config'
import type { BusinessType, VerificationState } from '@/components/ui/VerifiedBadge'

export interface SearchResult {
  providerId: string
  slug: string | null
  businessName: string
  bio: string | null
  profileImage: string | null
  locationCity: string | null
  providerTypeSlug: string
  providerTypeName: string
  tags: string[]
  avgRating: number | null
  googleRating: number | null
  googleRatingCount: number
  finalScore: number
  businessType: BusinessType
  verification: VerificationState
}

// ---- Fetch + rank ----

export interface SearchResultPage {
  results: SearchResult[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function searchProviders(params: {
  categoryId: string | null
  query?: string
  providerTypeSlug?: string
  tagNames?: string[]
  config: ConfigStore
  page?: number
  pageSize?: number
}): Promise<SearchResultPage> {
  const { categoryId, query, providerTypeSlug, tagNames, config } = params
  const pageSize = params.pageSize ?? 24
  const page = Math.max(1, params.page ?? 1)
  // Ranking is computed over the whole candidate pool (score depends on
  // relative comparison, not a DB ORDER BY), so this fetches a bounded pool
  // once and paginates by slicing the ranked list — not by re-querying per page.
  const candidatePoolSize = 300
  const supabase = await createClient()

  // Build provider type filter: resolve slug → id if needed, scoped to category.
  let providerTypeIds: string[] | null = null
  if (providerTypeSlug || categoryId) {
    let ptQuery = supabase.from('provider_types').select('id')
    if (categoryId) ptQuery = ptQuery.eq('category_id', categoryId)
    if (providerTypeSlug) ptQuery = ptQuery.eq('slug', providerTypeSlug)
    const { data: pts } = await ptQuery
    providerTypeIds = pts?.map((pt) => pt.id) ?? []
  }

  // Build tag filter: resolve tag names → provider ids.
  let tagFilteredProviderIds: string[] | null = null
  if (tagNames && tagNames.length > 0) {
    const { data: tags } = await supabase
      .from('tags')
      .select('id')
      .in('name', tagNames)
    const tagIds = tags?.map((t) => t.id) ?? []
    if (tagIds.length > 0) {
      const { data: provTags } = await supabase
        .from('provider_tags')
        .select('provider_id')
        .in('tag_id', tagIds)
      tagFilteredProviderIds = [...new Set(provTags?.map((pt) => pt.provider_id) ?? [])]
    } else {
      tagFilteredProviderIds = []
    }
  }

  // Fetch providers with all related data needed for ranking.
  let providersQuery = supabase
    .from('providers')
    .select(`
      id,
      slug,
      business_name,
      bio,
      profile_image,
      location_city,
      is_published,
      provider_type_id,
      google_rating,
      google_rating_count,
      business_type,
      verified_contact,
      verified_cipc,
      verified_fica,
      provider_types!inner(id, name, slug, category_id),
      provider_tags(tag:tags(name)),
      rating_average,
      rating_count
    `)
    .eq('is_published', true)
    .limit(candidatePoolSize)

  const emptyPage: SearchResultPage = { results: [], total: 0, page, pageSize, totalPages: 1 }

  if (providerTypeIds !== null && providerTypeIds.length > 0) {
    providersQuery = providersQuery.in('provider_type_id', providerTypeIds)
  } else if (providerTypeIds !== null && providerTypeIds.length === 0) {
    // No matching types — return empty early.
    return emptyPage
  }

  // Apply the free-text query as an actual DB filter (business_name OR bio),
  // not just a post-fetch relevance score — otherwise a match outside the
  // arbitrary `limit * 3` slice below is silently invisible.
  const trimmedQuery = query?.trim()
  if (trimmedQuery) {
    const escaped = trimmedQuery.replace(/[%_]/g, (c) => `\\${c}`)
    providersQuery = providersQuery.or(`business_name.ilike.%${escaped}%,bio.ilike.%${escaped}%`)
  }

  if (tagFilteredProviderIds !== null) {
    if (tagFilteredProviderIds.length === 0) return emptyPage
    providersQuery = providersQuery.in('id', tagFilteredProviderIds)
  }

  const { data: rows } = await providersQuery
  if (!rows || rows.length === 0) return emptyPage

  const candidates: ScoredProvider[] = rows.map((row) => {
    // Trigger-maintained cached aggregate (excludes hidden reviews). Reading
    // the cached column rather than reducing a live join keeps ranking and the
    // displayed rating from diverging.
    const avgRating = Number(row.rating_average ?? 0)

    const tags = ((row.provider_tags as { tag: { name: string }[] }[] | null) ?? [])
      .map((pt) => pt.tag?.[0]?.name)
      .filter((n): n is string => !!n)

    const textMatch = scoreTextMatch(row.business_name, row.bio, query)
    const tagMatch = scoreTagMatch(tags, tagNames)
    const reviewQuality = avgRating / 5
    const profileCompleteness = scoreProfileCompleteness(row)

    return {
      providerId: row.id,
      isPublished: row.is_published,
      signals: {
        textMatch,
        location: 0, // no location data in v1
        tags: tagMatch,
        reviewQuality,
        completedBookings: 0, // excluded from this query to keep it fast
        profileCompleteness,
        reliabilityPenalty: 0,
      },
    }
  })

  const ranked = await rankProviders(candidates, config)

  const rowById = new Map(rows.map((r) => [r.id, r]))
  const total = ranked.length
  const from = (page - 1) * pageSize

  const results = ranked.slice(from, from + pageSize).map((r) => {
    const row = rowById.get(r.providerId)!
    const reviewCount = Number(row.rating_count ?? 0)
    const avgRating = reviewCount > 0 ? Number(row.rating_average) : null
    const providerType = Array.isArray(row.provider_types)
      ? row.provider_types[0]
      : row.provider_types
    const tags = ((row.provider_tags as { tag: { name: string }[] }[] | null) ?? [])
      .map((pt) => pt.tag?.[0]?.name)
      .filter((n): n is string => !!n)

    return {
      providerId: row.id,
      slug: row.slug,
      businessName: row.business_name,
      bio: row.bio,
      profileImage: row.profile_image,
      locationCity: row.location_city,
      providerTypeSlug: (providerType as { slug: string } | null)?.slug ?? '',
      providerTypeName: (providerType as { name: string } | null)?.name ?? '',
      tags,
      avgRating,
      googleRating: (row as { google_rating?: number | null }).google_rating ?? null,
      googleRatingCount: (row as { google_rating_count?: number | null }).google_rating_count ?? 0,
      finalScore: r.finalScore,
      businessType: (row as { business_type?: BusinessType }).business_type ?? null,
      verification: {
        contact: Boolean((row as { verified_contact?: boolean | null }).verified_contact),
        cipc: Boolean((row as { verified_cipc?: boolean | null }).verified_cipc),
        fica: Boolean((row as { verified_fica?: boolean | null }).verified_fica),
      },
    }
  })

  return { results, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}

// ---- Signal helpers ----

function scoreTextMatch(
  businessName: string,
  bio: string | null,
  query?: string,
): number {
  if (!query || query.trim() === '') return 0.5 // neutral when no query
  const q = query.toLowerCase()
  const haystack = `${businessName} ${bio ?? ''}`.toLowerCase()
  if (businessName.toLowerCase().includes(q)) return 1
  if (haystack.includes(q)) return 0.7
  const tokens = q.split(/\s+/)
  const matched = tokens.filter((t) => haystack.includes(t)).length
  return matched / tokens.length
}

function scoreTagMatch(providerTags: string[], filterTags?: string[]): number {
  if (!filterTags || filterTags.length === 0) return 0.5
  const matched = filterTags.filter((t) => providerTags.includes(t)).length
  return matched / filterTags.length
}

function scoreProfileCompleteness(row: {
  business_name: string
  bio: string | null
  profile_image: string | null
  provider_tags: unknown
  // Cached aggregate rather than a live reviews join — see the note at the
  // scoring call site.
  rating_count?: number | null
}): number {
  let score = 0
  if (row.business_name) score += 0.3
  if (row.bio) score += 0.3
  if (row.profile_image) score += 0.2
  if (Array.isArray(row.provider_tags) && row.provider_tags.length > 0) score += 0.1
  if (Number(row.rating_count ?? 0) > 0) score += 0.1
  return score
}
