/**
 * Signal-assembly layer between Supabase and lib/domain/liquidity.ts —
 * mirrors the role lib/search.ts plays for lib/domain/ranking.ts.
 *
 * Computes, per (category, city) cell:
 *  - claimed, bookable provider count
 *  - completed bookings in the trailing 30 days
 *  - 24h provider-response rate and median response time
 *  - funnel counts pulled from funnel_events (pre-booking steps) and
 *    booking_status_history (booking-lifecycle steps) — never duplicated,
 *    always read live from the two existing sources.
 *
 * Call this from a service-role context only (cron route). Every query
 * here uses createAdminClient() deliberately, matching funnel_events'
 * access model — there is no per-category-city RLS policy for a
 * cross-provider aggregation to run under.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import {
  earliestProviderResponse,
  isLiquidCell,
  median,
  respondedWithin24h,
  responseMinutes,
  type CellStats,
} from '@/lib/domain/liquidity'
import {
  MIN_COMPLETED_BOOKINGS_30D,
  MIN_PROVIDERS_PER_CELL,
  MIN_RESPONSE_RATE_24H,
} from '@/lib/liquidity-config'

const ROLLING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

export interface LiquidityCellRow {
  category: string
  city: string
  providerCount: number
  completedBookings30d: number
  responseRate24h: number | null
  medianResponseMinutes: number | null
  searchPerformedCount: number
  serviceViewedCount: number
  bookingStartedCount: number
  bookingCompletedCount: number
  isLiquid: boolean
}

interface CellKey {
  category: string
  city: string
}

function cellKey(category: string, city: string): string {
  return `${category} ${city}`
}

/** Every (category, city) combination with at least one claimed, published provider. */
async function loadCells(admin: ReturnType<typeof createAdminClient>): Promise<{
  cells: CellKey[]
  providerCountByCell: Map<string, number>
  providerIdsByCell: Map<string, string[]>
}> {
  const { data: rows } = await admin
    .from('providers')
    .select('id, location_city, claim_status, is_published, provider_types(provider_categories(slug))')
    .eq('is_published', true)
    .eq('claim_status', 'claimed')
    .not('location_city', 'is', null)

  const providerCountByCell = new Map<string, number>()
  const providerIdsByCell = new Map<string, string[]>()
  const cells = new Map<string, CellKey>()

  for (const row of rows ?? []) {
    const city = row.location_city as string | null
    if (!city) continue

    const providerTypes = Array.isArray(row.provider_types) ? row.provider_types : [row.provider_types]
    for (const providerType of providerTypes) {
      const categories = Array.isArray(providerType?.provider_categories)
        ? providerType.provider_categories
        : [providerType?.provider_categories]
      for (const cat of categories) {
        const slug = cat?.slug as string | undefined
        if (!slug) continue
        const key = cellKey(slug, city)
        cells.set(key, { category: slug, city })
        providerCountByCell.set(key, (providerCountByCell.get(key) ?? 0) + 1)
        const ids = providerIdsByCell.get(key) ?? []
        ids.push(row.id as string)
        providerIdsByCell.set(key, ids)
      }
    }
  }

  return { cells: [...cells.values()], providerCountByCell, providerIdsByCell }
}

/** Completed bookings in the trailing 30 days, grouped by provider. */
async function loadCompletedBookings30d(
  admin: ReturnType<typeof createAdminClient>,
): Promise<Map<string, number>> {
  const since = new Date(Date.now() - ROLLING_WINDOW_MS).toISOString()
  const { data } = await admin
    .from('bookings')
    .select('provider_id')
    .in('status', ['completed', 'completed_by_provider'])
    .gte('completed_at', since)

  const byProvider = new Map<string, number>()
  for (const row of data ?? []) {
    const providerId = row.provider_id as string
    byProvider.set(providerId, (byProvider.get(providerId) ?? 0) + 1)
  }
  return byProvider
}

interface ResponseStats {
  respondedByProvider: Map<string, number>
  totalAcceptedByProvider: Map<string, number>
  responseMinutesByProvider: Map<string, number[]>
}

/**
 * Provider first-response timing per booking, unioning booking_messages
 * and messages (via message_threads.booking_id) — earliest wins across
 * both systems. Only bookings accepted in the trailing 30 days are
 * considered, to bound the query and match the completed-bookings window.
 * One pass over the accepted/messages data feeds both the response-rate
 * and median-response-time figures, rather than querying it twice.
 */
async function loadResponseStats(admin: ReturnType<typeof createAdminClient>): Promise<ResponseStats> {
  const since = new Date(Date.now() - ROLLING_WINDOW_MS).toISOString()

  const { data: accepted } = await admin
    .from('booking_status_history')
    .select('booking_id, created_at, bookings!inner(id, provider_id)')
    .eq('to_status', 'accepted')
    .gte('created_at', since)

  const acceptedRows = (accepted ?? [])
    .map((row) => {
      const booking = Array.isArray(row.bookings) ? row.bookings[0] : row.bookings
      return {
        bookingId: row.booking_id as string,
        acceptedAt: row.created_at as string,
        providerId: booking?.provider_id as string | undefined,
      }
    })
    .filter((r): r is { bookingId: string; acceptedAt: string; providerId: string } => Boolean(r.providerId))

  const totalAcceptedByProvider = new Map<string, number>()
  for (const r of acceptedRows) {
    totalAcceptedByProvider.set(r.providerId, (totalAcceptedByProvider.get(r.providerId) ?? 0) + 1)
  }

  if (acceptedRows.length === 0) {
    return { respondedByProvider: new Map(), totalAcceptedByProvider, responseMinutesByProvider: new Map() }
  }

  const bookingIds = acceptedRows.map((r) => r.bookingId)

  const [{ data: bookingMessages }, { data: threads }] = await Promise.all([
    admin
      .from('booking_messages')
      .select('booking_id, sender_role, created_at')
      .in('booking_id', bookingIds)
      .eq('sender_role', 'provider'),
    admin
      .from('message_threads')
      .select('id, booking_id')
      .in('booking_id', bookingIds),
  ])

  const threadToBooking = new Map<string, string>()
  for (const t of threads ?? []) {
    if (t.booking_id) threadToBooking.set(t.id as string, t.booking_id as string)
  }

  let inboxMessages: { thread_id: string; actor: string; created_at: string }[] = []
  if (threadToBooking.size > 0) {
    const { data } = await admin
      .from('messages')
      .select('thread_id, actor, created_at')
      .in('thread_id', [...threadToBooking.keys()])
      .eq('actor', 'provider')
    inboxMessages = data ?? []
  }

  const firstResponseByBooking = new Map<string, string[]>()
  for (const m of bookingMessages ?? []) {
    const list = firstResponseByBooking.get(m.booking_id as string) ?? []
    list.push(m.created_at as string)
    firstResponseByBooking.set(m.booking_id as string, list)
  }
  for (const m of inboxMessages) {
    const bookingId = threadToBooking.get(m.thread_id)
    if (!bookingId) continue
    const list = firstResponseByBooking.get(bookingId) ?? []
    list.push(m.created_at)
    firstResponseByBooking.set(bookingId, list)
  }

  const respondedByProvider = new Map<string, number>()
  const responseMinutesByProvider = new Map<string, number[]>()
  for (const { bookingId, acceptedAt, providerId } of acceptedRows) {
    const firstResponse = earliestProviderResponse(firstResponseByBooking.get(bookingId) ?? [])
    if (!respondedWithin24h(acceptedAt, firstResponse)) continue

    respondedByProvider.set(providerId, (respondedByProvider.get(providerId) ?? 0) + 1)

    const minutes = responseMinutes(acceptedAt, firstResponse!)
    const list = responseMinutesByProvider.get(providerId) ?? []
    list.push(minutes)
    responseMinutesByProvider.set(providerId, list)
  }

  return { respondedByProvider, totalAcceptedByProvider, responseMinutesByProvider }
}

/** Funnel counts from funnel_events, grouped by (category, city). Booking-lifecycle steps come from booking_status_history separately. */
async function loadFunnelCounts(
  admin: ReturnType<typeof createAdminClient>,
): Promise<Map<string, { searchPerformed: number; serviceViewed: number }>> {
  const since = new Date(Date.now() - ROLLING_WINDOW_MS).toISOString()
  const { data } = await admin
    .from('funnel_events')
    .select('event_type, category, city')
    .in('event_type', ['search_performed', 'service_viewed'])
    .not('category', 'is', null)
    .not('city', 'is', null)
    .gte('created_at', since)

  const counts = new Map<string, { searchPerformed: number; serviceViewed: number }>()
  for (const row of data ?? []) {
    const key = cellKey(row.category as string, row.city as string)
    const entry = counts.get(key) ?? { searchPerformed: 0, serviceViewed: 0 }
    if (row.event_type === 'search_performed') entry.searchPerformed++
    if (row.event_type === 'service_viewed') entry.serviceViewed++
    counts.set(key, entry)
  }
  return counts
}

/** booking_started / booking_completed counts per provider, trailing 30 days, read from booking_status_history. */
async function loadBookingLifecycleCounts(
  admin: ReturnType<typeof createAdminClient>,
): Promise<{ startedByProvider: Map<string, number>; completedByProvider: Map<string, number> }> {
  const since = new Date(Date.now() - ROLLING_WINDOW_MS).toISOString()

  const { data: started } = await admin
    .from('booking_status_history')
    .select('booking_id, created_at, bookings!inner(provider_id)')
    .eq('to_status', 'requested')
    .gte('created_at', since)

  const { data: completed } = await admin
    .from('booking_status_history')
    .select('booking_id, created_at, bookings!inner(provider_id)')
    .in('to_status', ['completed', 'completed_by_provider'])
    .gte('created_at', since)

  const startedByProvider = new Map<string, number>()
  for (const row of started ?? []) {
    const booking = Array.isArray(row.bookings) ? row.bookings[0] : row.bookings
    if (!booking?.provider_id) continue
    startedByProvider.set(booking.provider_id, (startedByProvider.get(booking.provider_id) ?? 0) + 1)
  }

  const completedByProvider = new Map<string, number>()
  for (const row of completed ?? []) {
    const booking = Array.isArray(row.bookings) ? row.bookings[0] : row.bookings
    if (!booking?.provider_id) continue
    completedByProvider.set(booking.provider_id, (completedByProvider.get(booking.provider_id) ?? 0) + 1)
  }

  return { startedByProvider, completedByProvider }
}

export async function computeLiquidityCells(): Promise<LiquidityCellRow[]> {
  const admin = createAdminClient()

  const [
    { cells, providerCountByCell, providerIdsByCell },
    completedBookings30dByProvider,
    { respondedByProvider, totalAcceptedByProvider, responseMinutesByProvider },
    funnelCountsByCell,
    { startedByProvider, completedByProvider },
  ] = await Promise.all([
    loadCells(admin),
    loadCompletedBookings30d(admin),
    loadResponseStats(admin),
    loadFunnelCounts(admin),
    loadBookingLifecycleCounts(admin),
  ])

  return cells.map(({ category, city }) => {
    const key = cellKey(category, city)
    const providerIds = providerIdsByCell.get(key) ?? []

    let completedBookings30d = 0
    let bookingStartedCount = 0
    let bookingCompletedCount = 0
    let responded = 0
    let totalAccepted = 0
    const allMinutes: number[] = []

    for (const providerId of providerIds) {
      completedBookings30d += completedBookings30dByProvider.get(providerId) ?? 0
      bookingStartedCount += startedByProvider.get(providerId) ?? 0
      bookingCompletedCount += completedByProvider.get(providerId) ?? 0
      responded += respondedByProvider.get(providerId) ?? 0
      totalAccepted += totalAcceptedByProvider.get(providerId) ?? 0
      allMinutes.push(...(responseMinutesByProvider.get(providerId) ?? []))
    }

    const responseRate24h = totalAccepted > 0 ? responded / totalAccepted : null
    const funnel = funnelCountsByCell.get(key)

    const stats: CellStats = {
      providerCount: providerCountByCell.get(key) ?? 0,
      completedBookings30d,
      responseRate24h,
    }

    return {
      category,
      city,
      providerCount: stats.providerCount,
      completedBookings30d,
      responseRate24h,
      medianResponseMinutes: median(allMinutes),
      searchPerformedCount: funnel?.searchPerformed ?? 0,
      serviceViewedCount: funnel?.serviceViewed ?? 0,
      bookingStartedCount,
      bookingCompletedCount,
      isLiquid: isLiquidCell(stats, {
        minProvidersPerCell: MIN_PROVIDERS_PER_CELL,
        minResponseRate24h: MIN_RESPONSE_RATE_24H,
        minCompletedBookings30d: MIN_COMPLETED_BOOKINGS_30D,
      }),
    }
  })
}
