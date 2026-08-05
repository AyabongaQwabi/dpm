import type { SupabaseClient } from '@supabase/supabase-js'
import type { DiscountType } from '@/lib/db'
import type { BusinessType, VerificationState } from '@/components/ui/VerifiedBadge'

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
  isFeatured: boolean
  businessType: BusinessType
  verification: VerificationState
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
  is_featured?: boolean | null
  business_type?: BusinessType
  verified_contact?: boolean | null
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
    isFeatured: Boolean(row.is_featured),
    businessType: row.business_type ?? null,
    verification: {
      contact: Boolean(row.verified_contact),
      cipc: Boolean(row.verified_cipc),
      fica: Boolean(row.verified_fica),
    },
  }
}

export function providerSelect() {
  return `
    id,
    slug,
    business_name,
    bio,
    profile_image,
    location_city,
    is_featured,
    business_type,
    verified_contact,
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

  query = query.order('created_at', { ascending: false })

  const { data } = await query
  const providers = ((data ?? []) as unknown as ProviderRow[]).map(toProviderCard)
  return options.orderByRating
    ? providers.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
    : providers
}

export async function getCategories(supabase: SupabaseClient): Promise<CategoryView[]> {
  const { data } = await supabase
    .from('provider_categories')
    .select('id, name, slug, description, icon, provider_types(providers(id))')
    .order('name', { ascending: true })

  return ((data ?? []) as unknown as Array<{
    id: string
    name: string
    slug: string
    description: string | null
    icon: string | null
    provider_types?: Array<{ providers?: Array<{ id: string }> | null }> | null
  }>).map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    providerCount: (category.provider_types ?? []).reduce(
      (sum, type) => sum + (type.providers?.length ?? 0),
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
      service_packages(id, name, price, discount_type, discount_amount, is_default, display_order),
      provider:providers!inner(
        business_name,
        slug,
        profile_image,
        location_city,
        provider_types!inner(provider_categories!inner(slug)),
        reviews(rating)
      )
    `)
    .eq('is_published', true)
    .eq('providers.is_published', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (options.categorySlug) {
    query = query.eq('providers.provider_types.provider_categories.slug', options.categorySlug)
  }
  if (options.search) {
    query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`)
  }
  if (options.city) {
    query = query.ilike('providers.location_city', `%${options.city}%`)
  }
  if (options.minPrice !== undefined) {
    query = query.gte('price', options.minPrice)
  }
  if (options.maxPrice !== undefined) {
    query = query.lte('price', options.maxPrice)
  }

  const { data } = await query

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
