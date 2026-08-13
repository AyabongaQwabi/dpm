/**
 * Liquid-cell classification: a category x city cell is "liquid" when it
 * clears all three configured thresholds at once. Pure — no DB, no
 * framework imports (ARCH-006). Thresholds are injected by the caller from
 * lib/liquidity-config.ts so this stays testable without config wiring.
 */

export interface CellThresholds {
  minProvidersPerCell: number
  minResponseRate24h: number
  minCompletedBookings30d: number
}

export interface CellStats {
  providerCount: number
  completedBookings30d: number
  /** null when there is no response-time data for the cell yet (no bookings, or no messages sent). */
  responseRate24h: number | null
}

export function isLiquidCell(stats: CellStats, thresholds: CellThresholds): boolean {
  if (stats.providerCount < thresholds.minProvidersPerCell) return false
  if (stats.completedBookings30d < thresholds.minCompletedBookings30d) return false
  if (stats.responseRate24h === null) return false
  if (stats.responseRate24h < thresholds.minResponseRate24h) return false
  return true
}

/**
 * The earliest provider-authored timestamp across the two message systems
 * for a booking, or null if the provider has not sent one. Callers gather
 * timestamps from both booking_messages and messages (joined via
 * message_threads.booking_id) — this function only picks the minimum.
 */
export function earliestProviderResponse(timestamps: (string | null | undefined)[]): string | null {
  const valid = timestamps.filter((t): t is string => Boolean(t))
  if (valid.length === 0) return null
  return valid.reduce((earliest, current) => (current < earliest ? current : earliest))
}

/** Whether a provider's first response landed within 24h of the booking being accepted. */
export function respondedWithin24h(acceptedAt: string, firstResponseAt: string | null): boolean {
  if (!firstResponseAt) return false
  const acceptedMs = new Date(acceptedAt).getTime()
  const respondedMs = new Date(firstResponseAt).getTime()
  return respondedMs - acceptedMs <= 24 * 60 * 60 * 1000
}

export function responseMinutes(acceptedAt: string, firstResponseAt: string): number {
  const acceptedMs = new Date(acceptedAt).getTime()
  const respondedMs = new Date(firstResponseAt).getTime()
  return Math.max(0, Math.round((respondedMs - acceptedMs) / 60000))
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

// ── Leakage CSV sample (Part 4) ─────────────────────────────────────────

export interface LeakageSampleRow {
  bookingId: string
  customerName: string
  customerEmail: string
  customerPhone: string | null
  providerBusinessName: string
  serviceTitle: string
  city: string | null
  startedAt: string
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`
  return value
}

export function toCsv(rows: LeakageSampleRow[]): string {
  const header = [
    'booking_id',
    'customer_name',
    'customer_email',
    'customer_phone',
    'provider_business_name',
    'service_title',
    'city',
    'started_at',
  ]
  const lines = rows.map((r) =>
    [
      r.bookingId,
      r.customerName,
      r.customerEmail,
      r.customerPhone ?? '',
      r.providerBusinessName,
      r.serviceTitle,
      r.city ?? '',
      r.startedAt,
    ]
      .map((v) => csvEscape(String(v)))
      .join(','),
  )
  return [header.join(','), ...lines].join('\n')
}
