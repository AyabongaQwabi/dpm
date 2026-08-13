/**
 * Shared loader for the two booking detail pages.
 *
 * Both dashboards render the same booking from opposite sides, so the query
 * lives once here. Reads use the request-scoped anon client, so RLS is the
 * backstop even though each page also checks the session's ownership.
 */

import { createClient } from '@/lib/supabase/server'
import type { TimelineEvent } from '@/components/booking/BookingTimeline'

export interface BookingDetail {
  id: string
  status: string
  paymentStatus: string | null
  finalPrice: number
  netPayoutAmount: number
  cancellationReason: string | null
  disputeReason: string | null
  notes: string | null
  createdAt: string
  completedAt: string | null
  lastNudgeAt: string | null
  serviceId: string
  serviceTitle: string
  packageName: string | null
  packageId: string | null
  providerId: string
  providerName: string
  providerSlug: string | null
  customerId: string
  customerName: string
  customerEmail: string
  customerPhone: string | null
}

function one<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null
  return Array.isArray(rel) ? rel[0] ?? null : rel
}

export async function loadBookingDetail(
  bookingId: string,
): Promise<BookingDetail | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('bookings')
    .select(
      `id, status, payment_status, final_price, provider_payout_amount,
       cancellation_reason, dispute_reason, notes, created_at, completed_at,
       last_nudge_at, service_id, provider_id, customer_id, package_id,
       service:services!bookings_service_id_fkey(title),
       package:service_packages!bookings_package_id_fkey(name),
       provider:providers!bookings_provider_id_fkey(business_name, slug),
       customer:customers!bookings_customer_id_fkey(name, email, phone)`,
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (!data) return null

  const service = one(data.service as { title: string } | { title: string }[])
  const pkg = one(data.package as { name: string } | { name: string }[])
  const provider = one(
    data.provider as
      | { business_name: string; slug: string | null }
      | { business_name: string; slug: string | null }[],
  )
  const customer = one(
    data.customer as
      | { name: string; email: string; phone: string | null }
      | { name: string; email: string; phone: string | null }[],
  )

  return {
    id: data.id,
    status: data.status,
    paymentStatus: data.payment_status,
    finalPrice: Math.round(Number(data.final_price ?? 0)),
    netPayoutAmount: Math.round(Number(data.provider_payout_amount ?? 0)),
    cancellationReason: data.cancellation_reason,
    disputeReason: data.dispute_reason,
    notes: data.notes,
    createdAt: data.created_at,
    completedAt: data.completed_at,
    lastNudgeAt: data.last_nudge_at,
    serviceId: data.service_id,
    serviceTitle: service?.title ?? 'Service',
    packageName: pkg?.name ?? null,
    packageId: data.package_id,
    providerId: data.provider_id,
    providerName: provider?.business_name ?? 'Provider',
    providerSlug: provider?.slug ?? null,
    customerId: data.customer_id,
    customerName: customer?.name ?? 'Customer',
    customerEmail: customer?.email ?? '',
    customerPhone: customer?.phone ?? null,
  }
}

/** The booking's timeline, oldest first. */
export async function loadBookingEvents(bookingId: string): Promise<TimelineEvent[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('booking_status_history')
    .select('id, from_status, to_status, actor_type, event_type, note, created_at')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true })

  return (data ?? []).map((row) => ({
    id: row.id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    eventType: row.event_type ?? 'status_change',
    note: row.note,
    createdAt: row.created_at,
    actorRole: row.actor_type,
  }))
}

/** Short human-facing booking reference. */
export function bookingReference(bookingId: string): string {
  return bookingId.slice(0, 8).toUpperCase()
}
