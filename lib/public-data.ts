import type { SupabaseClient } from '@supabase/supabase-js'
import type { DiscountType } from '@/lib/db'
import type { BusinessType, VerificationState } from '@/components/ui/VerifiedBadge'
import {
  SPONSORED_DENSITY_CAP_PER_TEN,
  SPONSORED_MIN_RATING_THRESHOLD,
  SPONSORED_ROTATION_WINDOW_HOURS,
  SPONSORED_VISIBLE_SLOTS,
} from '@/lib/sponsored-config'
import { isEligibleForSponsoredPlacement, maxSponsoredForOrganicCount, rotateList } from '@/lib/domain/sponsored'

export interface ProviderCardView {
  id: string
  slug: string | null
  business_name: string
  bio: string | null
  profile_image: string | null
  providerTypeName: string
  providerTypeSlug: string | null
  categoryName: string | null
  categorySlug: string | null
  locationCity: string | null
  tags: string[]
  avgRating: number | null
  reviewCount: number
  googleRating: number | null
  googleRatingCount: number
  isFeatured: boolean
  businessType: BusinessType
  verification: VerificationState
  /** C.2 disclosure: true when this card fills a sponsored (not editorial) slot. */
  isSponsored?: boolean
}

export interface CategoryView {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  providerCount: number
}

export interface PackageSummary {
  id: string
  name: string
  price: number
  discount_type: DiscountType
  discount_amount: number | null
  is_default: boolean
  display_order: number
}

export interface ServiceView {
  id: string
  provider_id: string
  title: string
  description: string
  /** Lowest effective package price — use this for display on cards */
  price: number
  discount_type: DiscountType
  discount_amount: number | null
  image: string | null
  providerName: string
  providerSlug: string | null
  providerProfileImage: string | null
  providerAvgRating: number | null
  providerReviewCount: number
  locationCity: string | null
  categorySlug: string | null
  packages: PackageSummary[]
}

type ProviderRow = {
  id: string
  slug: string | null
  business_name: string
  bio: string | null
  profile_image: string | null
  location_city: string | null
  google_rating?: number | null
  google_rating_count?: number | null
  is_featured?: boolean | null
  business_type?: BusinessType
  verified_contact?: boolean | null
  verified_google?: boolean | null
  verified_cipc?: boolean | null
  verified_fica?: boolean | null
  provider_types?: {
    name: string
    slug: string
    provider_categories?: { name: string; slug: string } | { name: string; slug: string }[] | null
  } | {
    name: string
    slug: string
    provider_categories?: { name: string; slug: string } | { name: string; slug: string }[] | null
  }[] | null
  provider_tags?: { tag: { name: string } | { name: string }[] | null }[] | null
  reviews?: { rating: number }[] | null
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export function toProviderCard(row: ProviderRow): ProviderCardView {
  const type = first(row.provider_types)
  const category = first(type?.provider_categories)
  const reviews = row.reviews ?? []
  const tags = (row.provider_tags ?? [])
    .map((t) => first(t.tag)?.name)
    .filter((name): name is string => Boolean(name))

  return {
    id: row.id,
    slug: row.slug,
    business_name: row.business_name,
    bio: row.bio,
    profile_image: row.profile_image,
    providerTypeName: type?.name ?? 'Provider',
    providerTypeSlug: type?.slug ?? null,
    categoryName: category?.name ?? null,
    categorySlug: category?.slug ?? null,
    locationCity: row.location_city,
    tags,
    avgRating: reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null,
    reviewCount: reviews.length,
    googleRating: row.google_rating ?? null,
    googleRatingCount: row.google_rating_count ?? 0,
    isFeatured: Boolean(row.is_featured),
    businessType: row.business_type ?? null,
    verification: {
      contact: Boolean(row.verified_contact),
      google: Boolean(row.verified_google),
      cipc: Boolean(row.verified_cipc),
      fica: Boolean(row.verified_fica),
    },
  }
}

function isSponsoredProviderRenderable(provider: ProviderCardView): boolean {
  return isEligibleForSponsoredPlacement({
    hasContactVerification: Boolean(provider.verification.contact),
    hasOpenDispute: false,
    averageRating: provider.avgRating,
    minRatingThreshold: SPONSORED_MIN_RATING_THRESHOLD,
  })
}

function toSponsoredCard(row: ProviderRow): ProviderCardView {
  return { ...toProviderCard(row), isSponsored: true }
}

export function providerSelect() {
  return `
    id,
    slug,
    business_name,
    bio,
    profile_image,
    location_city,
    google_rating,
    google_rating_count,
    is_featured,
    business_type,
    verified_contact,
    verified_google,
    verified_cipc,
    verified_fica,
    provider_types!inner(
      name,
      slug,
      provider_categories!inner(name, slug)
    ),
    provider_tags(tag:tags(name)),
    reviews(rating)
  `
}

export async function getPublishedProviders(
  supabase: SupabaseClient,
  options: {
    limit?: number
    categorySlug?: string
    city?: string
    featured?: boolean
    /** Only providers with a real profile image AND bio — used as the
     *  "featured" fallback when no provider is manually flagged, so the
     *  section doesn't surface an incomplete scraped listing. */
    withCompleteProfile?: boolean
    /** Holds at least one of contact/Google/CIPC/FICA verification. */
    verifiedOnly?: boolean
    orderByRating?: boolean
  } = {},
) {
  let query = supabase
    .from('providers')
    .select(providerSelect())
    .eq('is_published', true)
    .limit(options.limit ?? 24)

  if (options.categorySlug) {
    query = query.eq('provider_types.provider_categories.slug', options.categorySlug)
  }
  if (options.city) {
    query = query.ilike('location_city', options.city.replaceAll('-', ' '))
  }
  if (options.featured) {
    query = query.eq('is_featured', true)
  }
  if (options.withCompleteProfile) {
    query = query.not('profile_image', 'is', null).not('bio', 'is', null)
  }
  if (options.verifiedOnly) {
    query = query.or(
      'verified_contact.eq.true,verified_google.eq.true,verified_cipc.eq.true,verified_fica.eq.true',
    )
  }

  query = query.order('created_at', { ascending: false })

  const { data } = await query
  const providers = ((data ?? []) as unknown as ProviderRow[]).map(toProviderCard)
  return options.orderByRating
    ? providers.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
    : providers
}

/**
 * Featured-strip selection: verified providers only, spread across
 * categories rather than clustered in one. On a vertical tenant (a single
 * category already scoped by the domain) this collapses to a normal
 * verified-only fetch within that category — there's nothing to spread across.
 *
 * Strategy: pull verified providers per top-level category (round-robin,
 * most recent first within each), then interleave so no single category can
 * fill the whole strip. Falls back to non-verified providers with a complete
 * profile only if the verified pool can't fill the strip — callers should
 * treat an under-filled strip as a data gap, not silently show unverified
 * listings as "featured".
 */
export async function getFeaturedProviders(
  supabase: SupabaseClient,
  categories: CategoryView[],
  options: { limit?: number; categorySlug?: string } = {},
): Promise<{ providers: ProviderCardView[]; verifiedPoolSize: number }> {
  const limit = options.limit ?? 6

  if (options.categorySlug) {
    const providers = await getPublishedProviders(supabase, {
      categorySlug: options.categorySlug,
      verifiedOnly: true,
      limit,
    })
    return { providers, verifiedPoolSize: providers.length }
  }

  const perCategory = await Promise.all(
    categories.map((category) =>
      getPublishedProviders(supabase, {
        categorySlug: category.slug,
        verifiedOnly: true,
        limit,
      }),
    ),
  )

  const verifiedPoolSize = perCategory.reduce((sum, list) => sum + list.length, 0)

  // Round-robin interleave across categories so the strip can't be filled by
  // one category's verified providers alone.
  const interleaved: ProviderCardView[] = []
  let round = 0
  while (interleaved.length < limit) {
    let addedInRound = false
    for (const list of perCategory) {
      if (list[round]) {
        interleaved.push(list[round])
        addedInRound = true
        if (interleaved.length >= limit) break
      }
    }
    if (!addedInRound) break
    round += 1
  }

  return { providers: interleaved, verifiedPoolSize }
}

/**
 * C.4: the homepage featured strip reads from sponsored_placements where
 * applicable, but always keeps an editorial fallback so the strip is never
 * 100% paid inventory. Sponsored providers fill up to the density cap;
 * the rest of the strip is always the existing verified/round-robin
 * editorial selection. Sponsored cards are prepended (their own reserved
 * slot) but the editorial list underneath is untouched — same C.2 rule as
 * search: a sponsored slot never reorders or replaces organic selection,
 * it's added alongside it.
 */
export async function getFeaturedProvidersWithSponsored(
  supabase: SupabaseClient,
  categories: CategoryView[],
  options: { limit?: number; categorySlug?: string } = {},
): Promise<{ providers: ProviderCardView[]; verifiedPoolSize: number }> {
  const limit = options.limit ?? 6
  const editorial = await getFeaturedProviders(supabase, categories, options)

  // Site-wide category_city_feature placements (no category/city scope) are
  // the only sponsored inventory eligible for the homepage strip.
  const now = new Date().toISOString()
  const { data: placements } = await supabase
    .from('sponsored_placements')
    .select('provider_id')
    .eq('placement_type', 'category_city_feature')
    .eq('status', 'active')
    .is('category_id', null)
    .is('city', null)
    .lte('starts_at', now)
    .gte('ends_at', now)
    .order('starts_at', { ascending: true })

  if (!placements || placements.length === 0) {
    return editorial
  }

  const maxSponsoredSlots = maxSponsoredForOrganicCount(editorial.providers.length, SPONSORED_DENSITY_CAP_PER_TEN)

  const editorialIds = new Set(editorial.providers.map((p) => p.id))
  const sponsoredProviderIds = placements
    .map((p) => p.provider_id)
    .filter((id) => !editorialIds.has(id))
    .slice(0, maxSponsoredSlots)

  if (sponsoredProviderIds.length === 0) {
    return editorial
  }

  const { data: sponsoredRows } = await supabase
    .from('providers')
    .select(providerSelect())
    .in('id', sponsoredProviderIds)
    .eq('is_published', true)

  const sponsoredCards = ((sponsoredRows ?? []) as unknown as ProviderRow[])
    .map(toSponsoredCard)
    .filter(isSponsoredProviderRenderable)

  // Sponsored cards get their own slots ahead of the editorial list, capped
  // so the strip stays majority-editorial; never let sponsored crowd out the
  // full editorial set.
  const combined = [...sponsoredCards, ...editorial.providers].slice(0, limit + sponsoredCards.length)

  return { providers: combined, verifiedPoolSize: editorial.verifiedPoolSize }
}

/**
 * C.2/C.1: fetches active sponsored providers scoped to a specific
 * category + city pair, for a given placement_type. Read-only, additive —
 * callers render these in their own labelled slot; they never replace or
 * reorder the organic list fetched separately via getPublishedProvidersPage.
 */
export async function getSponsoredForCategoryCity(
  supabase: SupabaseClient,
  placementType: 'search_top_slot' | 'category_city_feature',
  categoryId: string,
  city: string,
): Promise<ProviderCardView[]> {
  const now = new Date().toISOString()
  const { data: placements } = await supabase
    .from('sponsored_placements')
    .select('provider_id')
    .eq('placement_type', placementType)
    .eq('status', 'active')
    .eq('category_id', categoryId)
    .eq('city', city)
    .lte('starts_at', now)
    .gte('ends_at', now)
    .order('starts_at', { ascending: true })

  if (!placements || placements.length === 0) return []

  const providerIds = rotateList(
    placements.map((p) => p.provider_id),
    new Date(),
    SPONSORED_ROTATION_WINDOW_HOURS,
  )
  if (providerIds.length === 0) return []

  const { data: rows } = await supabase
    .from('providers')
    .select(providerSelect())
    .in('id', providerIds)
    .eq('is_published', true)

  const cardsById = new Map<string, ProviderCardView>(
    ((rows ?? []) as unknown as ProviderRow[]).map((row) => {
      const card = toSponsoredCard(row)
      return [card.id, card]
    }),
  )

  return providerIds
    .map((id) => cardsById.get(id))
    .filter((card): card is ProviderCardView => Boolean(card))
    .filter(isSponsoredProviderRenderable)
}

export async function getFloatingSponsoredProvider(
  supabase: SupabaseClient,
): Promise<ProviderCardView | null> {
  const now = new Date().toISOString()
  const { data: placements } = await supabase
    .from('sponsored_placements')
    .select('provider_id')
    .eq('placement_type', 'floating_box')
    .eq('status', 'active')
    .is('category_id', null)
    .is('city', null)
    .lte('starts_at', now)
    .gte('ends_at', now)
    .order('starts_at', { ascending: true })

  if (!placements || placements.length === 0) return null

  const providerIds = rotateList(
    placements.map((p) => p.provider_id),
    new Date(),
    SPONSORED_ROTATION_WINDOW_HOURS,
  )

  const { data: rows } = await supabase
    .from('providers')
    .select(providerSelect())
    .in('id', providerIds)
    .eq('is_published', true)

  const cardsById = new Map<string, ProviderCardView>(
    ((rows ?? []) as unknown as ProviderRow[]).map((row) => {
      const card = toSponsoredCard(row)
      return [card.id, card]
    }),
  )

  return providerIds
    .map((id) => cardsById.get(id))
    .filter((card): card is ProviderCardView => Boolean(card))
    .filter(isSponsoredProviderRenderable)
    .slice(0, SPONSORED_VISIBLE_SLOTS.floating_box)[0] ?? null
}

export interface ProviderPage {
  providers: ProviderCardView[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Paginated variant of getPublishedProviders — separate function (rather than
 * an option on getPublishedProviders) so existing unpaginated callers are
 * unaffected. Supports composing categorySlug + city together, which the
 * single-filter category/[slug] and in/[location] pages didn't previously
 * allow linking between.
 */
export async function getPublishedProvidersPage(
  supabase: SupabaseClient,
  options: {
    page?: number
    pageSize?: number
    categorySlug?: string
    city?: string
    orderByRating?: boolean
  } = {},
): Promise<ProviderPage> {
  const pageSize = options.pageSize ?? 24
  const page = Math.max(1, options.page ?? 1)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('providers')
    .select(providerSelect(), { count: 'exact' })
    .eq('is_published', true)

  if (options.categorySlug) {
    query = query.eq('provider_types.provider_categories.slug', options.categorySlug)
  }
  if (options.city) {
    query = query.ilike('location_city', options.city.replaceAll('-', ' '))
  }

  // Rating-ordered listings can't be paginated at the DB level (rating is
  // computed client-side from the joined reviews array), so that mode fetches
  // a bounded pool, sorts, then slices — same tradeoff getPublishedProviders
  // already made for orderByRating.
  if (options.orderByRating) {
    query = query.limit(500)
  } else {
    query = query.order('created_at', { ascending: false }).range(from, to)
  }

  const { data, count, error } = await query
  if (error) throw new Error(`getPublishedProvidersPage: ${error.message}`)

  let providers = ((data ?? []) as unknown as ProviderRow[]).map(toProviderCard)
  let total = count ?? providers.length

  if (options.orderByRating) {
    providers = providers.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
    total = providers.length
    providers = providers.slice(from, to + 1)
  }

  return {
    providers,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export async function getCategories(supabase: SupabaseClient): Promise<CategoryView[]> {
  const { data } = await supabase
    .from('provider_categories')
    .select('id, name, slug, description, icon, provider_types(providers(id, is_published))')
    .order('name', { ascending: true })

  return ((data ?? []) as unknown as Array<{
    id: string
    name: string
    slug: string
    description: string | null
    icon: string | null
    provider_types?: Array<{ providers?: Array<{ id: string; is_published: boolean }> | null }> | null
  }>).map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    providerCount: (category.provider_types ?? []).reduce(
      (sum, type) => sum + (type.providers?.filter((p) => p.is_published).length ?? 0),
      0,
    ),
  }))
}

export async function getLocations(supabase: SupabaseClient, limit = 8) {
  const { data } = await supabase
    .from('providers')
    .select('location_city')
    .eq('is_published', true)
    .not('location_city', 'is', null)
    .limit(200)

  const counts = new Map<string, number>()
  for (const row of (data ?? []) as Array<{ location_city: string | null }>) {
    if (!row.location_city) continue
    counts.set(row.location_city, (counts.get(row.location_city) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([city, count]) => ({ city, slug: city.toLowerCase().replaceAll(' ', '-'), count }))
}

export async function getServices(
  supabase: SupabaseClient,
  limit = 48,
  options: {
    categorySlug?: string
    search?: string
    city?: string
    minPrice?: number
    maxPrice?: number
  } = {},
): Promise<ServiceView[]> {
  let query = supabase
    .from('services')
    .select(`
      id,
      provider_id,
      title,
      description,
      price,
      discount_type,
      discount_amount,
      image,
      service_packages:service_packages!service_packages_service_id_fkey(
        id,
        name,
        price,
        discount_type,
        discount_amount,
        is_default,
        display_order
      ),
      provider:providers!services_provider_id_fkey!inner(
        business_name,
        slug,
        profile_image,
        location_city,
        is_published,
        provider_types:provider_types!providers_provider_type_id_fkey!inner(
          provider_categories:provider_categories!provider_types_category_id_fkey!inner(slug)
        ),
        reviews:reviews!reviews_provider_id_fkey(rating)
      )
    `)
    .eq('is_published', true)
    .eq('provider.is_published', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (options.categorySlug) {
    query = query.eq('provider.provider_types.provider_categories.slug', options.categorySlug)
  }
  if (options.search) {
    query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`)
  }
  if (options.city) {
    query = query.ilike('provider.location_city', `%${options.city}%`)
  }
  if (options.minPrice !== undefined) {
    query = query.gte('price', options.minPrice)
  }
  if (options.maxPrice !== undefined) {
    query = query.lte('price', options.maxPrice)
  }

  const { data, error } = await query
  if (error) {
    console.error('Services listing query failed:', error.message)
    return []
  }

  type RawPackage = {
    id: string; name: string; price: number
    discount_type: DiscountType; discount_amount: number | null
    is_default: boolean; display_order: number
  }
  type RawProvider = {
    business_name: string
    slug: string | null
    profile_image?: string | null
    location_city: string | null
    is_published?: boolean
    provider_types?: { provider_categories?: { slug: string } | { slug: string }[] | null } | { provider_categories?: { slug: string } | { slug: string }[] | null }[] | null
    reviews?: { rating: number }[] | null
  }

  function effectivePkgPrice(pkg: RawPackage): number {
    if (pkg.discount_type === 'amount' && pkg.discount_amount !== null) return Number(pkg.price) - Number(pkg.discount_amount)
    if (pkg.discount_type === 'percent' && pkg.discount_amount !== null) return Number(pkg.price) * (1 - Number(pkg.discount_amount) / 100)
    return Number(pkg.price)
  }

  return ((data ?? []) as unknown as Array<{
    id: string
    provider_id: string
    title: string
    description: string
    price: number
    discount_type: DiscountType
    discount_amount: number | null
    image: string | null
    service_packages?: RawPackage[] | null
    provider: RawProvider | RawProvider[]
  }>).map((service) => {
    const provider = first(service.provider) as RawProvider | null
    const type = first(provider?.provider_types ?? null)
    const category = first(type?.provider_categories)
    const reviews = provider?.reviews ?? []
    const packages: PackageSummary[] = ((service.service_packages ?? []) as RawPackage[])
      .sort((a, b) => a.display_order - b.display_order)
      .map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        price: Number(pkg.price),
        discount_type: pkg.discount_type,
        discount_amount: pkg.discount_amount !== null ? Number(pkg.discount_amount) : null,
        is_default: pkg.is_default,
        display_order: pkg.display_order,
      }))

    // Displayed price = lowest effective package price (or fall back to service.price)
    const lowestPrice = packages.length
      ? Math.min(...packages.map(effectivePkgPrice))
      : Number(service.price)
    // For card discount display, use the default (or first) package's discount
    const defaultPkg = packages.find((p) => p.is_default) ?? packages[0]

    return {
      id: service.id,
      provider_id: service.provider_id,
      title: service.title,
      description: service.description,
      price: lowestPrice,
      discount_type: defaultPkg?.discount_type ?? service.discount_type,
      discount_amount: defaultPkg?.discount_amount ?? service.discount_amount,
      image: service.image,
      providerName: provider?.business_name ?? 'Provider',
      providerSlug: provider?.slug ?? service.provider_id,
      providerProfileImage: provider?.profile_image ?? null,
      providerAvgRating: reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null,
      providerReviewCount: reviews.length,
      locationCity: provider?.location_city ?? null,
      categorySlug: category?.slug ?? null,
      packages,
    }
  })
}

export function titleFromSlug(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
