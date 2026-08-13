// Signal assembly + recommended-service fetching layer (mirrors lib/search.ts pattern).
// Tenant-scoped via categorySlug from the existing tenant context.

import { createClient } from '@/lib/supabase/server'
import { rankServices, type ServiceRankingInput } from '@/lib/domain/service-ranking'
import type { ConfigStore } from '@/lib/domain/config'
import type { DiscountType } from '@/lib/db'

export interface RecommendedService {
  serviceId: string
  providerId: string
  providerName: string
  providerSlug: string | null
  title: string
  description: string
  image: string | null
  serviceType: string
  // Pricing from the default package
  defaultPackageId: string | null
  defaultPackageName: string | null
  defaultPrice: number | null
  defaultDiscountType: DiscountType | null
  defaultDiscountAmount: number | null
  acceptsCustomQuotes: boolean
  avgRating: number | null
  reviewCount: number
  score: number
}

export async function getRecommendedServices(params: {
  config: ConfigStore
  categorySlug?: string | null
  providerId?: string | null  // scoped to one provider's services
  limit?: number
}): Promise<RecommendedService[]> {
  const { config, categorySlug, providerId, limit = 12 } = params
  const supabase = await createClient()
  const now = new Date()

  // Build category filter
  let categoryId: string | null = null
  if (categorySlug) {
    const { data: cat } = await supabase
      .from('provider_categories')
      .select('id')
      .eq('slug', categorySlug)
      .single()
    if (!cat) return []
    categoryId = cat.id
  }

  // Fetch published services with related data
  let servicesQuery = supabase
    .from('services')
    .select(`
      id, title, description, image, service_type, is_published, accepts_custom_quotes,
      provider:providers!inner(id, business_name, slug, provider_type_id, is_published,
        provider_types!inner(category_id)),
      service_packages(id, name, price, discount_type, discount_amount, is_default),
      reviews(id, rating, created_at)
    `)
    .eq('is_published', true)
    .eq('provider.is_published', true)
    .limit(limit * 5)

  if (providerId) {
    servicesQuery = servicesQuery.eq('provider_id', providerId)
  }

  const { data: rows } = await servicesQuery
  if (!rows || rows.length === 0) return []

  // Filter by category after fetch (provider_type → category_id)
  const filtered = categoryId
    ? rows.filter((row) => {
        const provider = Array.isArray(row.provider) ? row.provider[0] : row.provider
        const pt = provider?.provider_types
        const providerType = Array.isArray(pt) ? pt[0] : pt
        return (providerType as { category_id?: string } | null)?.category_id === categoryId
      })
    : rows

  // Also fetch completed booking counts per service
  const serviceIds = filtered.map((r) => r.id)
  if (serviceIds.length === 0) return []

  const { data: bookingRows } = await supabase
    .from('bookings')
    .select('service_id')
    .in('service_id', serviceIds)
    .eq('status', 'completed')

  const bookingCountMap = new Map<string, number>()
  for (const b of bookingRows ?? []) {
    bookingCountMap.set(b.service_id, (bookingCountMap.get(b.service_id) ?? 0) + 1)
  }

  // Assemble ranking inputs
  const inputs: ServiceRankingInput[] = filtered.map((row) => {
    const reviews = ((row.reviews as { id: string; rating: number; created_at: string }[] | null) ?? []).map((r) => ({
      rating: r.rating,
      ageInDays: Math.max(0, (now.getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24)),
    }))
    return {
      serviceId: row.id,
      isPublished: row.is_published,
      reviews,
      completedBookings: bookingCountMap.get(row.id) ?? 0,
      providerReliabilityPenalty: 0, // v1: no cancellation data yet
    }
  })

  const ranked = await rankServices(inputs, config)
  const eligible = ranked.filter((r) => r.eligible)

  const rowById = new Map(filtered.map((r) => [r.id, r]))

  return eligible.slice(0, limit).map((r) => {
    const row = rowById.get(r.serviceId)!
    const provider = Array.isArray(row.provider) ? row.provider[0] : row.provider
    const packages = ((row.service_packages as {
      id: string; name: string; price: number; discount_type: string;
      discount_amount: number | null; is_default: boolean
    }[] | null) ?? [])
    const defaultPkg = packages.find((p) => p.is_default) ?? packages[0] ?? null
    const reviews = (row.reviews as { rating: number }[] | null) ?? []
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, rv) => sum + rv.rating, 0) / reviews.length
      : null

    return {
      serviceId: row.id,
      providerId: (provider as { id: string } | null)?.id ?? '',
      providerName: (provider as { business_name: string } | null)?.business_name ?? '',
      providerSlug: (provider as { slug: string | null } | null)?.slug ?? null,
      title: row.title,
      description: row.description,
      image: row.image,
      serviceType: row.service_type,
      defaultPackageId: defaultPkg?.id ?? null,
      defaultPackageName: defaultPkg?.name ?? null,
      defaultPrice: defaultPkg ? Number(defaultPkg.price) : null,
      defaultDiscountType: defaultPkg ? (defaultPkg.discount_type as DiscountType) : null,
      defaultDiscountAmount: defaultPkg?.discount_amount ? Number(defaultPkg.discount_amount) : null,
      acceptsCustomQuotes: !!row.accepts_custom_quotes,
      avgRating,
      reviewCount: reviews.length,
      score: r.score,
    }
  })
}
