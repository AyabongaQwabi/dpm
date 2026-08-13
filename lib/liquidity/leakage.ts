/**
 * Liquidity instrumentation, part 4: leakage measurement.
 *
 * Two rates, both aggregate (by category x city), computed against the
 * config window (LEAKAGE_WINDOW_DAYS):
 *   - service_viewed with no booking_started in the following window
 *   - booking_started with no payment captured in the following window
 *
 * "viewed, never booked" is aggregate-only. funnel_events.service_viewed
 * carries no link to a real, contactable person — session_id is an
 * anonymous pre-auth id, and the service page does not resolve customer
 * identity today even for logged-in visitors (see the recon report).
 * Extending that is a separate scope decision, not made here.
 *
 * "started, never paid" IS exportable with contact details, since
 * bookings.customer_id links to a known customer row. In practice this
 * case is near-empty today: payment_status is set to 'captured'
 * atomically in the same INSERT that creates the booking
 * (create_booking_with_credit_spend), so there is currently no live path
 * that leaves a booking in a not-yet-paid state. The query is still built
 * correctly against payment_status so it starts finding real cases the
 * moment that changes (e.g. a future non-wallet payment method).
 *
 * The CSV export is a manual-trigger research tool only — it returns rows,
 * it does not send anything. No route/page invokes it in this pass.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { LEAKAGE_WINDOW_DAYS } from '@/lib/liquidity-config'
import { toCsv, type LeakageSampleRow } from '@/lib/domain/liquidity'

export { toCsv, type LeakageSampleRow }

export interface LeakageRateRow {
  category: string
  city: string
  serviceViewedCount: number
  bookingStartedCount: number
  viewedNeverBookedRate: number
  bookingsInWindow: number
  neverPaidCount: number
  neverPaidRate: number
}

function cellKey(category: string, city: string): string {
  return `${category} ${city}`
}

/**
 * service_viewed events with no booking_started (booking_status_history
 * to_status = 'requested') for the same provider within the window that
 * followed the view. Grouped by (category, city).
 */
export async function computeViewedNeverBookedRates(): Promise<Map<string, { serviceViewedCount: number; bookingStartedCount: number; rate: number }>> {
  const admin = createAdminClient()
  const since = new Date(Date.now() - LEAKAGE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: views } = await admin
    .from('funnel_events')
    .select('category, city, provider_id, created_at')
    .eq('event_type', 'service_viewed')
    .not('category', 'is', null)
    .not('city', 'is', null)
    .not('provider_id', 'is', null)
    .gte('created_at', since)

  const { data: started } = await admin
    .from('booking_status_history')
    .select('created_at, bookings!inner(provider_id)')
    .eq('to_status', 'requested')
    .gte('created_at', since)

  const startedByProvider = new Map<string, { created_at: string }[]>()
  for (const row of started ?? []) {
    const booking = Array.isArray(row.bookings) ? row.bookings[0] : row.bookings
    const providerId = booking?.provider_id as string | undefined
    if (!providerId) continue
    const list = startedByProvider.get(providerId) ?? []
    list.push({ created_at: row.created_at as string })
    startedByProvider.set(providerId, list)
  }

  const byCell = new Map<string, { serviceViewedCount: number; bookingStartedCount: number }>()

  for (const view of views ?? []) {
    const category = view.category as string
    const city = view.city as string
    const providerId = view.provider_id as string
    const key = cellKey(category, city)
    const entry = byCell.get(key) ?? { serviceViewedCount: 0, bookingStartedCount: 0 }
    entry.serviceViewedCount += 1

    const windowEnd = new Date(
      new Date(view.created_at as string).getTime() + LEAKAGE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString()
    const hasBookingAfterView = (startedByProvider.get(providerId) ?? []).some(
      (b) => b.created_at >= (view.created_at as string) && b.created_at <= windowEnd,
    )
    if (hasBookingAfterView) entry.bookingStartedCount += 1

    byCell.set(key, entry)
  }

  const result = new Map<string, { serviceViewedCount: number; bookingStartedCount: number; rate: number }>()
  for (const [key, { serviceViewedCount, bookingStartedCount }] of byCell) {
    const neverBooked = serviceViewedCount - bookingStartedCount
    result.set(key, {
      serviceViewedCount,
      bookingStartedCount,
      rate: serviceViewedCount > 0 ? neverBooked / serviceViewedCount : 0,
    })
  }
  return result
}

/**
 * Bookings created in the window whose payment_status never reached
 * 'captured'. See the module comment: this is expected to be near-empty
 * under the current credit-wallet payment model.
 */
export async function computeStartedNeverPaidRates(): Promise<Map<string, { bookingsInWindow: number; neverPaidCount: number; rate: number }>> {
  const admin = createAdminClient()
  const since = new Date(Date.now() - LEAKAGE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: bookings } = await admin
    .from('bookings')
    .select('payment_status, provider_id, created_at, providers!inner(location_city, provider_types(provider_categories(slug)))')
    .gte('created_at', since)

  const byCell = new Map<string, { bookingsInWindow: number; neverPaidCount: number }>()

  for (const row of bookings ?? []) {
    const provider = Array.isArray(row.providers) ? row.providers[0] : row.providers
    const city = provider?.location_city as string | undefined
    if (!city) continue

    const providerTypes = Array.isArray(provider?.provider_types) ? provider.provider_types : [provider?.provider_types]
    for (const providerType of providerTypes) {
      const categories = Array.isArray(providerType?.provider_categories)
        ? providerType.provider_categories
        : [providerType?.provider_categories]
      for (const cat of categories) {
        const slug = cat?.slug as string | undefined
        if (!slug) continue
        const key = cellKey(slug, city)
        const entry = byCell.get(key) ?? { bookingsInWindow: 0, neverPaidCount: 0 }
        entry.bookingsInWindow += 1
        if (row.payment_status !== 'captured') entry.neverPaidCount += 1
        byCell.set(key, entry)
      }
    }
  }

  const result = new Map<string, { bookingsInWindow: number; neverPaidCount: number; rate: number }>()
  for (const [key, { bookingsInWindow, neverPaidCount }] of byCell) {
    result.set(key, {
      bookingsInWindow,
      neverPaidCount,
      rate: bookingsInWindow > 0 ? neverPaidCount / bookingsInWindow : 0,
    })
  }
  return result
}

export async function computeLeakageRates(): Promise<LeakageRateRow[]> {
  const [viewedNeverBooked, startedNeverPaid] = await Promise.all([
    computeViewedNeverBookedRates(),
    computeStartedNeverPaidRates(),
  ])

  const keys = new Set([...viewedNeverBooked.keys(), ...startedNeverPaid.keys()])
  const rows: LeakageRateRow[] = []

  for (const key of keys) {
    const [category, ...cityParts] = key.split(' ')
    const city = cityParts.join(' ')
    const viewed = viewedNeverBooked.get(key)
    const paid = startedNeverPaid.get(key)

    rows.push({
      category,
      city,
      serviceViewedCount: viewed?.serviceViewedCount ?? 0,
      bookingStartedCount: viewed?.bookingStartedCount ?? 0,
      viewedNeverBookedRate: viewed?.rate ?? 0,
      bookingsInWindow: paid?.bookingsInWindow ?? 0,
      neverPaidCount: paid?.neverPaidCount ?? 0,
      neverPaidRate: paid?.rate ?? 0,
    })
  }

  return rows
}

// ── Manual-trigger CSV sample: "started, never paid" only ──────────────────
// LeakageSampleRow and toCsv are pure — defined in lib/domain/liquidity.ts,
// re-exported above for callers that only need this module.

/**
 * A random sample of "started, never paid" bookings with contact details,
 * for a human to follow up by phone/WhatsApp about whether the job
 * happened off-platform. Returns rows only — sends nothing. sampleSize
 * defaults to config; the caller is expected to be a deliberate, manual
 * invocation (no cron, no route wired to this in this pass).
 */
export async function sampleLeakageForExport(sampleSize: number): Promise<LeakageSampleRow[]> {
  const admin = createAdminClient()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: bookings } = await admin
    .from('bookings')
    .select(
      'id, payment_status, created_at, customers(name, email, phone), providers(business_name, location_city), services(title)',
    )
    .neq('payment_status', 'captured')
    .gte('created_at', since)
    .limit(500)

  const rows: LeakageSampleRow[] = []
  for (const row of bookings ?? []) {
    const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers
    const provider = Array.isArray(row.providers) ? row.providers[0] : row.providers
    const service = Array.isArray(row.services) ? row.services[0] : row.services
    if (!customer || !provider) continue

    rows.push({
      bookingId: row.id as string,
      customerName: customer.name as string,
      customerEmail: customer.email as string,
      customerPhone: (customer.phone as string | null) ?? null,
      providerBusinessName: provider.business_name as string,
      serviceTitle: (service?.title as string | undefined) ?? '',
      city: (provider.location_city as string | null) ?? null,
      startedAt: row.created_at as string,
    })
  }

  // Fisher-Yates shuffle, then take sampleSize — a random sample, not just
  // the first N rows by created_at.
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rows[i], rows[j]] = [rows[j], rows[i]]
  }

  return rows.slice(0, sampleSize)
}
