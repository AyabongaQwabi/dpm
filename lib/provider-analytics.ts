import { createAdminClient } from '@/lib/supabase/admin'
import { ANALYTICS_MIN_COMPARISON_SAMPLE } from '@/lib/platform-config'
import { loadProviderResponseStats } from '@/lib/liquidity/cell-stats'
import { median } from '@/lib/domain/liquidity'
import {
  ANALYTICS_RANGE_DAYS,
  buildProviderAnalyticsRangeSummary,
  type AnalyticsRangeDays,
  type ProviderAnalyticsCounts,
  type ProviderAnalyticsSummary,
} from '@/lib/domain/provider-analytics'

const COMPARISON_UNAVAILABLE_REASON = 'not enough providers in your category and city yet to compare'

interface ProviderContext {
  category: string | null
  city: string | null
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function sinceIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

async function loadProviderContext(providerId: string): Promise<ProviderContext> {
  const admin = createAdminClient()
  const { data: provider } = await admin
    .from('providers')
    .select('location_city, provider_types(provider_categories(slug))')
    .eq('id', providerId)
    .maybeSingle()

  const providerType = first(provider?.provider_types)
  const category = first(providerType?.provider_categories)

  return {
    category: category?.slug ?? null,
    city: (provider?.location_city as string | null) ?? null,
  }
}

async function loadPeerProviderIds(context: ProviderContext): Promise<string[]> {
  if (!context.category || !context.city) return []

  const admin = createAdminClient()
  const { data: rows } = await admin
    .from('providers')
    .select('id, provider_types!inner(provider_categories!inner(slug))')
    .eq('is_published', true)
    .eq('claim_status', 'claimed')
    .eq('location_city', context.city)
    .eq('provider_types.provider_categories.slug', context.category)

  return (rows ?? []).map((row) => row.id as string)
}

function emptyCounts(): ProviderAnalyticsCounts {
  return {
    profileViews: 0,
    serviceViews: 0,
    bookingsStarted: 0,
    bookingsCompleted: 0,
    reviewCount: 0,
    averageRating: null,
    medianResponseMinutes: null,
  }
}

function ensureCounts(map: Map<string, ProviderAnalyticsCounts>, providerId: string): ProviderAnalyticsCounts {
  const existing = map.get(providerId)
  if (existing) return existing

  const created = emptyCounts()
  map.set(providerId, created)
  return created
}

async function loadFunnelCounts(
  providerIds: string[],
  since: string,
): Promise<Map<string, Pick<ProviderAnalyticsCounts, 'profileViews' | 'serviceViews'>>> {
  const byProvider = new Map<string, Pick<ProviderAnalyticsCounts, 'profileViews' | 'serviceViews'>>()
  if (providerIds.length === 0) return byProvider

  const admin = createAdminClient()
  const { data } = await admin
    .from('funnel_events')
    .select('provider_id, event_type')
    .in('provider_id', providerIds)
    .in('event_type', ['profile_viewed', 'service_viewed'])
    .gte('created_at', since)

  for (const row of data ?? []) {
    const providerId = row.provider_id as string | null
    if (!providerId) continue
    const counts = byProvider.get(providerId) ?? { profileViews: 0, serviceViews: 0 }
    if (row.event_type === 'profile_viewed') counts.profileViews += 1
    if (row.event_type === 'service_viewed') counts.serviceViews += 1
    byProvider.set(providerId, counts)
  }

  return byProvider
}

async function loadBookingLifecycleCounts(
  providerIds: string[],
  since: string,
): Promise<Map<string, Pick<ProviderAnalyticsCounts, 'bookingsStarted' | 'bookingsCompleted'>>> {
  const byProvider = new Map<string, Pick<ProviderAnalyticsCounts, 'bookingsStarted' | 'bookingsCompleted'>>()
  if (providerIds.length === 0) return byProvider

  const admin = createAdminClient()
  const [{ data: started }, { data: completed }] = await Promise.all([
    admin
      .from('booking_status_history')
      .select('bookings!inner(provider_id)')
      .eq('to_status', 'requested')
      .in('bookings.provider_id', providerIds)
      .gte('created_at', since),
    admin
      .from('booking_status_history')
      .select('bookings!inner(provider_id)')
      .in('to_status', ['completed', 'completed_by_provider'])
      .in('bookings.provider_id', providerIds)
      .gte('created_at', since),
  ])

  for (const row of started ?? []) {
    const booking = first(row.bookings)
    if (!booking?.provider_id) continue
    const counts = byProvider.get(booking.provider_id) ?? { bookingsStarted: 0, bookingsCompleted: 0 }
    counts.bookingsStarted += 1
    byProvider.set(booking.provider_id, counts)
  }

  for (const row of completed ?? []) {
    const booking = first(row.bookings)
    if (!booking?.provider_id) continue
    const counts = byProvider.get(booking.provider_id) ?? { bookingsStarted: 0, bookingsCompleted: 0 }
    counts.bookingsCompleted += 1
    byProvider.set(booking.provider_id, counts)
  }

  return byProvider
}

async function loadReviewCounts(
  providerIds: string[],
  since: string,
): Promise<Map<string, Pick<ProviderAnalyticsCounts, 'reviewCount' | 'averageRating'>>> {
  const byProvider = new Map<string, Pick<ProviderAnalyticsCounts, 'reviewCount' | 'averageRating'>>()
  if (providerIds.length === 0) return byProvider

  const admin = createAdminClient()
  const { data } = await admin
    .from('reviews')
    .select('provider_id, rating')
    .in('provider_id', providerIds)
    .eq('status', 'published')
    .gte('created_at', since)

  const ratings = new Map<string, number[]>()
  for (const row of data ?? []) {
    const list = ratings.get(row.provider_id as string) ?? []
    list.push(Number(row.rating))
    ratings.set(row.provider_id as string, list)
  }

  for (const [providerId, values] of ratings) {
    const total = values.reduce((sum, value) => sum + value, 0)
    byProvider.set(providerId, {
      reviewCount: values.length,
      averageRating: values.length ? total / values.length : null,
    })
  }

  return byProvider
}

async function loadCountsForProviders(
  providerIds: string[],
  days: AnalyticsRangeDays,
): Promise<Map<string, ProviderAnalyticsCounts>> {
  const since = sinceIso(days)
  const counts = new Map<string, ProviderAnalyticsCounts>()
  for (const providerId of providerIds) ensureCounts(counts, providerId)

  const [funnel, lifecycle, reviews, responseStats] = await Promise.all([
    loadFunnelCounts(providerIds, since),
    loadBookingLifecycleCounts(providerIds, since),
    loadReviewCounts(providerIds, since),
    loadProviderResponseStats(createAdminClient(), since, providerIds),
  ])

  for (const [providerId, value] of funnel) {
    Object.assign(ensureCounts(counts, providerId), value)
  }
  for (const [providerId, value] of lifecycle) {
    Object.assign(ensureCounts(counts, providerId), value)
  }
  for (const [providerId, value] of reviews) {
    Object.assign(ensureCounts(counts, providerId), value)
  }
  for (const [providerId, minutes] of responseStats.responseMinutesByProvider) {
    ensureCounts(counts, providerId).medianResponseMinutes = median(minutes)
  }

  return counts
}

export async function loadProviderAnalyticsSummary(input: {
  providerId: string
  canViewAnalytics: boolean
}): Promise<ProviderAnalyticsSummary> {
  if (!input.canViewAnalytics) {
    return { access: { allowed: false }, ranges: [], comparisonUnavailableReason: null }
  }

  const context = await loadProviderContext(input.providerId)
  const peerProviderIds = await loadPeerProviderIds(context)
  const providerIds = peerProviderIds.includes(input.providerId)
    ? peerProviderIds
    : [input.providerId, ...peerProviderIds]

  const ranges = await Promise.all(
    ANALYTICS_RANGE_DAYS.map(async (days) => {
      const counts = await loadCountsForProviders(providerIds, days)
      const provider = counts.get(input.providerId) ?? emptyCounts()
      const peerCounts = peerProviderIds
        .map((providerId) => counts.get(providerId) ?? emptyCounts())

      return buildProviderAnalyticsRangeSummary({
        days,
        provider,
        peerCounts,
        minComparisonSample: ANALYTICS_MIN_COMPARISON_SAMPLE,
      })
    }),
  )

  return {
    access: { allowed: true },
    ranges,
    comparisonUnavailableReason: peerProviderIds.length >= ANALYTICS_MIN_COMPARISON_SAMPLE
      ? null
      : COMPARISON_UNAVAILABLE_REASON,
  }
}
