/**
 * Booking lifecycle email orchestration.
 *
 * Loads the context an email needs (customer, provider, service, outstanding
 * requirements) and dispatches the right template for a given transition.
 *
 * Every entry point here is designed to be called as `void sendX(...)` — it
 * never throws to its caller and never participates in the caller's
 * transaction. A Resend failure logs and stops there.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { getProviderAuthEmail } from '@/lib/payments/verify-subscription'
import { SITE_URL } from '@/lib/seo'
import type { BookingStatus } from '@/lib/domain/booking'
import { NEW_MESSAGE_BATCH_WINDOW_MINUTES } from '@/lib/booking-lifecycle-config'
import {
  sendBookingAcceptedCustomerEmail,
  sendBookingCompletedCustomerEmail,
  sendBookingCompletedProviderEmail,
  sendBookingConfirmedCustomerEmail,
  sendBookingDeclinedCustomerEmail,
  sendNewBookingMessageEmail,
  sendNewBookingProviderEmail,
  sendAllRequirementsReceivedProviderEmail,
  sendRequirementsReminderCustomerEmail,
  sendWorkCompleteCustomerEmail,
} from '@/lib/email/resend'

export function customerBookingUrl(bookingId: string) {
  return `${SITE_URL}/customer-account/bookings/${bookingId}`
}

export function providerBookingUrl(bookingId: string) {
  return `${SITE_URL}/provider-dashboard/bookings/${bookingId}`
}

function firstName(name: string | null | undefined): string {
  return (name || '').trim().split(/\s+/)[0] || 'there'
}

interface BookingEmailContext {
  bookingId: string
  serviceTitle: string
  providerName: string
  providerEmail: string | null
  customerName: string | null
  customerEmail: string | null
  creditsSpent: number
  netPayoutAmount: number
  cancellationReason: string | null
  outstanding: string[]
  requirementLabels: string[]
}

/** One query set, reused by every template below. */
async function loadContext(bookingId: string): Promise<BookingEmailContext | null> {
  const admin = createAdminClient()

  const { data: booking } = await admin
    .from('bookings')
    .select(
      `id, provider_id, final_price, provider_payout_amount, cancellation_reason,
       customer:customers!bookings_customer_id_fkey(name, email),
       provider:providers!bookings_provider_id_fkey(business_name),
       service:services!bookings_service_id_fkey(title)`,
    )
    .eq('id', bookingId)
    .single()

  if (!booking) return null

  // Supabase returns embedded relations as an array or a single object
  // depending on the shape it infers — handle both (CLAUDE.md).
  const one = <T,>(rel: T | T[] | null): T | null =>
    Array.isArray(rel) ? (rel[0] ?? null) : rel

  const customer = one(booking.customer as { name: string; email: string } | { name: string; email: string }[] | null)
  const provider = one(booking.provider as { business_name: string } | { business_name: string }[] | null)
  const service = one(booking.service as { title: string } | { title: string }[] | null)

  // `providers` has no email column — provider identity lives in Supabase
  // Auth, resolved through the same helper the subscription cron uses.
  const [providerEmail, { requirementLabels, outstanding }] = await Promise.all([
    getProviderAuthEmail(booking.provider_id),
    loadRequirementState(bookingId),
  ])

  return {
    bookingId,
    serviceTitle: service?.title ?? 'your booking',
    providerName: provider?.business_name ?? 'Your provider',
    providerEmail,
    customerName: customer?.name ?? null,
    customerEmail: customer?.email ?? null,
    creditsSpent: Math.round(Number(booking.final_price ?? 0)),
    netPayoutAmount: Math.round(Number(booking.provider_payout_amount ?? 0)),
    cancellationReason: booking.cancellation_reason ?? null,
    outstanding,
    requirementLabels,
  }
}

/** Which snapshot requirements still have no live (non-deleted) file. */
export async function loadRequirementState(bookingId: string): Promise<{
  requirementLabels: string[]
  outstanding: string[]
  total: number
  fulfilled: number
}> {
  const admin = createAdminClient()

  const [{ data: reqs }, { data: files }] = await Promise.all([
    admin
      .from('booking_requirements')
      .select('id, label, sort_order')
      .eq('booking_id', bookingId)
      .order('sort_order', { ascending: true }),
    admin
      .from('booking_files')
      .select('requirement_id')
      .eq('booking_id', bookingId)
      .is('deleted_at', null),
  ])

  const requirements = reqs ?? []
  const canonical = new Map<string, { id: string; label: string; duplicateIds: Set<string> }>()

  for (const r of requirements) {
    const key = `${r.sort_order}:${r.label}`
    const existing = canonical.get(key)
    if (existing) {
      existing.duplicateIds.add(r.id)
    } else {
      canonical.set(key, { id: r.id, label: r.label, duplicateIds: new Set([r.id]) })
    }
  }

  const filledRequirementIds = new Set((files ?? []).map((f) => f.requirement_id).filter(Boolean))
  const canonicalRequirements = [...canonical.values()]
  const outstanding = canonicalRequirements
    .filter((r) => ![...r.duplicateIds].some((id) => filledRequirementIds.has(id)))
    .map((r) => r.label)

  return {
    requirementLabels: canonicalRequirements.map((r) => r.label),
    outstanding,
    total: canonicalRequirements.length,
    fulfilled: canonicalRequirements.length - outstanding.length,
  }
}

/**
 * Dispatch the email(s) for a status transition. Called by transitionBooking.
 * Swallows every error by design.
 */
export async function sendBookingLifecycleEmail(params: {
  bookingId: string
  status: BookingStatus
  note?: string | null
}): Promise<void> {
  try {
    const ctx = await loadContext(params.bookingId)
    if (!ctx) return

    const customerUrl = customerBookingUrl(params.bookingId)
    const providerUrl = providerBookingUrl(params.bookingId)

    switch (params.status) {
      case 'accepted':
        if (ctx.customerEmail) {
          await sendBookingAcceptedCustomerEmail({
            to: ctx.customerEmail,
            serviceTitle: ctx.serviceTitle,
            providerName: ctx.providerName,
            outstandingRequirements: ctx.outstanding,
            bookingUrl: customerUrl,
          })
        }
        break

      case 'declined':
        if (ctx.customerEmail) {
          await sendBookingDeclinedCustomerEmail({
            to: ctx.customerEmail,
            serviceTitle: ctx.serviceTitle,
            providerName: ctx.providerName,
            reason: params.note ?? ctx.cancellationReason,
            creditsRefunded: ctx.creditsSpent,
            browseUrl: `${SITE_URL}/search`,
          })
        }
        break

      case 'completed_by_provider':
        if (ctx.customerEmail) {
          await sendWorkCompleteCustomerEmail({
            to: ctx.customerEmail,
            serviceTitle: ctx.serviceTitle,
            providerName: ctx.providerName,
            bookingUrl: customerUrl,
          })
        }
        break

      case 'completed':
        // Both parties, per the Part 6 table.
        if (ctx.customerEmail) {
          await sendBookingCompletedCustomerEmail({
            to: ctx.customerEmail,
            serviceTitle: ctx.serviceTitle,
            providerName: ctx.providerName,
            creditsSpent: ctx.creditsSpent,
            bookingUrl: customerUrl,
          })
        }
        if (ctx.providerEmail) {
          await sendBookingCompletedProviderEmail({
            to: ctx.providerEmail,
            serviceTitle: ctx.serviceTitle,
            netPayoutAmount: ctx.netPayoutAmount,
            bookingUrl: providerUrl,
          })
        }
        break

      // cancelled / disputed / in_progress have no email in the Part 6 table.
      default:
        break
    }
  } catch (err) {
    console.error('Booking lifecycle email failed:', err)
  }
}

/** Booking-confirmed (customer) + new-booking (provider), sent at checkout. */
export async function sendBookingCreatedEmails(bookingId: string): Promise<void> {
  try {
    const ctx = await loadContext(bookingId)
    if (!ctx) return

    if (ctx.customerEmail) {
      await sendBookingConfirmedCustomerEmail({
        to: ctx.customerEmail,
        serviceTitle: ctx.serviceTitle,
        providerName: ctx.providerName,
        creditsSpent: ctx.creditsSpent,
        requirements: ctx.requirementLabels,
        bookingUrl: customerBookingUrl(bookingId),
      })
    }

    if (ctx.providerEmail) {
      await sendNewBookingProviderEmail({
        to: ctx.providerEmail,
        serviceTitle: ctx.serviceTitle,
        customerFirstName: firstName(ctx.customerName),
        amount: ctx.creditsSpent,
        requirementCount: ctx.requirementLabels.length,
        bookingUrl: providerBookingUrl(bookingId),
      })
    }
  } catch (err) {
    console.error('Booking created emails failed:', err)
  }
}

/** Provider-triggered nudge. Rate limiting is enforced by the caller. */
export async function sendRequirementsNudge(bookingId: string): Promise<void> {
  try {
    const ctx = await loadContext(bookingId)
    if (!ctx || !ctx.customerEmail || ctx.outstanding.length === 0) return

    await sendRequirementsReminderCustomerEmail({
      to: ctx.customerEmail,
      serviceTitle: ctx.serviceTitle,
      providerName: ctx.providerName,
      outstandingRequirements: ctx.outstanding,
      bookingUrl: customerBookingUrl(bookingId),
    })
  } catch (err) {
    console.error('Requirements nudge failed:', err)
  }
}

/** Fires only on the upload that clears the last outstanding requirement. */
export async function sendAllRequirementsReceivedIfComplete(
  bookingId: string,
): Promise<void> {
  try {
    const ctx = await loadContext(bookingId)
    if (!ctx || !ctx.providerEmail) return
    if (ctx.requirementLabels.length === 0) return
    if (ctx.outstanding.length > 0) return

    await sendAllRequirementsReceivedProviderEmail({
      to: ctx.providerEmail,
      serviceTitle: ctx.serviceTitle,
      customerFirstName: firstName(ctx.customerName),
      bookingUrl: providerBookingUrl(bookingId),
    })
  } catch (err) {
    console.error('All-requirements-received email failed:', err)
  }
}

/**
 * New-message notification, rate-limited so a rapid back-and-forth does not
 * generate an email per message. Suppressed if any message from the same
 * sender role landed on this booking inside the batching window.
 */
export async function sendNewMessageEmail(params: {
  bookingId: string
  senderRole: 'customer' | 'provider'
  body: string
}): Promise<void> {
  try {
    const admin = createAdminClient()
    const windowStart = new Date(
      Date.now() - NEW_MESSAGE_BATCH_WINDOW_MINUTES * 60 * 1000,
    ).toISOString()

    // More than one message from this sender in the window (the one just
    // written, plus an earlier one) means we already notified recently.
    const { count } = await admin
      .from('booking_messages')
      .select('id', { count: 'exact', head: true })
      .eq('booking_id', params.bookingId)
      .eq('sender_role', params.senderRole)
      .gte('created_at', windowStart)

    if ((count ?? 0) > 1) return

    const ctx = await loadContext(params.bookingId)
    if (!ctx) return

    const toCustomer = params.senderRole === 'provider'
    const to = toCustomer ? ctx.customerEmail : ctx.providerEmail
    if (!to) return

    const preview =
      params.body.length > 140 ? `${params.body.slice(0, 140)}…` : params.body

    await sendNewBookingMessageEmail({
      to,
      senderName: toCustomer ? ctx.providerName : firstName(ctx.customerName),
      serviceTitle: ctx.serviceTitle,
      preview,
      bookingUrl: toCustomer
        ? customerBookingUrl(params.bookingId)
        : providerBookingUrl(params.bookingId),
    })
  } catch (err) {
    console.error('New message email failed:', err)
  }
}
