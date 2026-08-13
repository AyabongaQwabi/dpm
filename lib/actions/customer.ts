'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCustomerSession } from '@/lib/session'
import { transitionBooking } from '@/lib/actions/booking-transitions'
import {
  canEditReview,
  canWriteReview,
  isValidRating,
} from '@/lib/domain/reviews'
import { REVIEW_EDITABLE_FOR_DAYS } from '@/lib/booking-lifecycle-config'
import { logFunnelEvent } from '@/lib/liquidity/log-funnel-event'

// ── Helpers ──────────────────────────────────────────────────────────────────

function revalidateAll() {
  revalidatePath('/customer-account', 'layout')
}

// ── Booking: cancel (requested state only — customer right per BOOK-LOGIC-002) ──

export async function cancelBooking(formData: FormData) {
  const { customer } = await requireCustomerSession()
  const bookingId = formData.get('bookingId') as string
  const reason = (formData.get('reason') as string | null)?.trim() || 'Cancelled by customer'

  // transitionBooking validates the from-state (only before work is finished),
  // checks the actor owns the booking, writes the audit row, and refunds the
  // credits to the wallet via the existing refund path.
  await transitionBooking({
    bookingId,
    to: 'cancelled',
    actorType: 'customer',
    actorId: customer.id,
    note: reason,
  })

  revalidateAll()
}

// ── Booking: confirm completion (customer acknowledges provider's completed mark) ──
// This moves the booking to 'completed' — triggers commission per spec.

export async function confirmCompletion(formData: FormData) {
  const { customer } = await requireCustomerSession()
  const bookingId = formData.get('bookingId') as string

  // transitionBooking creates the provider_payouts row (idempotently) and
  // emails both parties. The payout amounts are the ones frozen at booking
  // time, so a later commission-config change cannot alter an agreed price.
  const result = await transitionBooking({
    bookingId,
    to: 'completed',
    actorType: 'customer',
    actorId: customer.id,
  })

  revalidateAll()
  if (result.ok) redirect('/customer-account/reviews')
}

// ── Booking: raise an issue ──────────────────────────────────────────────────
//
// `disputed` is now a real status. This previously wrote a 'cancelled' row
// carrying cancellation_reason = '__dispute__' because the enum could not be
// extended safely at the time; that marker still exists on historical rows and
// lib/domain/booking-status.ts folds it into `disputed` for display.
//
// Raising the flag is all this does — no refund, no resolution workflow
// (explicitly out of scope). Support handles it from here.

export async function disputeBooking(formData: FormData) {
  const { customer } = await requireCustomerSession()
  const bookingId = formData.get('bookingId') as string
  const reason =
    (formData.get('reason') as string | null)?.trim() || 'Issue raised by customer'

  await transitionBooking({
    bookingId,
    to: 'disputed',
    actorType: 'customer',
    actorId: customer.id,
    note: reason,
  })

  revalidateAll()
}

// ── Review: submit (REV-001 — booking must be completed, one per booking) ──

export async function submitReview(formData: FormData) {
  const { customer } = await requireCustomerSession()
  const bookingId = formData.get('bookingId') as string
  const rating = Number(formData.get('rating'))
  const comment = (formData.get('comment') as string).trim()
  const serviceId = formData.get('serviceId') as string
  const packageId = (formData.get('packageId') as string | null) || null

  if (!bookingId || !comment || !isValidRating(rating)) return

  // Optional sub-ratings — supplementary, never required.
  const subRating = (field: string): number | null => {
    const raw = formData.get(field)
    if (raw === null || raw === '') return null
    const value = Number(raw)
    return isValidRating(value) ? value : null
  }

  const supabase = await createClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, provider_id, customer_id')
    .eq('id', bookingId)
    .eq('customer_id', customer.id)
    .single()

  if (!booking) return

  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle()

  // Gate: completed booking, owned by this customer, not already reviewed.
  // Also enforced in RLS — this is the friendly layer, not the boundary.
  const eligibility = canWriteReview({
    bookingStatus: booking.status,
    bookingCustomerId: booking.customer_id,
    actorCustomerId: customer.id,
    existingReview: !!existing,
  })

  if (!eligibility.ok) return

  const admin = createAdminClient()
  await admin.from('reviews').insert({
    booking_id: bookingId,
    provider_id: booking.provider_id,
    customer_id: customer.id,
    service_id: serviceId || null,
    package_id: packageId,
    rating,
    comment,
    rating_quality: subRating('rating_quality'),
    rating_communication: subRating('rating_communication'),
    rating_timeliness: subRating('rating_timeliness'),
    rating_value: subRating('rating_value'),
  })

  const { data: providerForEvent } = await admin
    .from('providers')
    .select('location_city, provider_types(provider_categories(slug))')
    .eq('id', booking.provider_id)
    .maybeSingle()
  const providerType = Array.isArray(providerForEvent?.provider_types)
    ? providerForEvent.provider_types[0]
    : providerForEvent?.provider_types
  const category = Array.isArray(providerType?.provider_categories)
    ? providerType.provider_categories[0]
    : providerType?.provider_categories

  await logFunnelEvent({
    eventType: 'review_submitted',
    category: category?.slug ?? null,
    city: providerForEvent?.location_city ?? null,
    providerId: booking.provider_id,
    sessionId: customer.id,
  })

  revalidateAll()
  redirect('/customer-account/reviews')
}

// ── Review: edit within the editable window, then locked ────────────────────

export async function updateReview(formData: FormData) {
  const { customer } = await requireCustomerSession()
  const reviewId = formData.get('reviewId') as string
  const rating = Number(formData.get('rating'))
  const comment = ((formData.get('comment') as string) || '').trim()

  if (!reviewId || !comment || !isValidRating(rating)) return

  const supabase = await createClient()
  const { data: review } = await supabase
    .from('reviews')
    .select('id, customer_id, created_at')
    .eq('id', reviewId)
    .eq('customer_id', customer.id)
    .maybeSingle()

  if (!review) return

  // Locked after the configured window. TODO(aya): confirm — suggested 14 days.
  if (
    !canEditReview({
      createdAt: review.created_at,
      editableForDays: REVIEW_EDITABLE_FOR_DAYS,
    })
  ) {
    return
  }

  const admin = createAdminClient()
  await admin
    .from('reviews')
    .update({ rating, comment, updated_at: new Date().toISOString() })
    .eq('id', reviewId)

  revalidateAll()
}

// ── Account: update personal details ──

export async function updatePersonalDetails(formData: FormData) {
  const { customer } = await requireCustomerSession()
  const name = (formData.get('name') as string).trim()
  const phone = (formData.get('phone') as string | null)?.trim() || null

  if (!name) return

  const admin = createAdminClient()
  await admin.from('customers').update({ name, phone, updated_at: new Date().toISOString() }).eq('id', customer.id)

  revalidateAll()
}

// ── Account: update password (delegates to Supabase Auth) ──

export async function updatePassword(formData: FormData) {
  const newPassword = formData.get('newPassword') as string
  if (!newPassword || newPassword.length < 8) return

  const supabase = await createClient()
  await supabase.auth.updateUser({ password: newPassword })

  revalidateAll()
}

// ── Saved providers: toggle ──

export async function toggleSavedProvider(formData: FormData) {
  const { customer } = await requireCustomerSession()
  const providerId = formData.get('providerId') as string
  const action = formData.get('action') as 'save' | 'unsave'

  const admin = createAdminClient()

  if (action === 'save') {
    await admin.from('saved_providers').upsert(
      { customer_id: customer.id, provider_id: providerId },
      { onConflict: 'customer_id,provider_id' },
    )
  } else {
    await admin.from('saved_providers')
      .delete()
      .eq('customer_id', customer.id)
      .eq('provider_id', providerId)
  }

  revalidateAll()
}

// ── Notification preferences: upsert ──

export async function updateNotificationPreferences(formData: FormData) {
  const { customer } = await requireCustomerSession()

  const booking_updates_email = formData.get('booking_updates_email') === 'on'
  const messages_email = formData.get('messages_email') === 'on'
  const promotional_email = formData.get('promotional_email') === 'on'

  const admin = createAdminClient()
  await admin.from('notification_preferences').upsert(
    {
      customer_id: customer.id,
      booking_updates_email,
      messages_email,
      promotional_email,
    },
    { onConflict: 'customer_id' },
  )

  revalidateAll()
}

// ── Messages: send (customer side) ──

export async function sendCustomerMessage(formData: FormData) {
  const { customer } = await requireCustomerSession()
  const threadId = formData.get('threadId') as string
  const body = (formData.get('body') as string).trim()
  if (!body) return

  const supabase = await createClient()
  const { data: thread } = await supabase
    .from('message_threads')
    .select('id')
    .eq('id', threadId)
    .eq('customer_id', customer.id)
    .single()

  if (!thread) return

  const admin = createAdminClient()
  await admin.from('messages').insert({ thread_id: threadId, actor: 'customer', body })
  await admin.from('message_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId)

  revalidatePath(`/customer-account/messages/${threadId}`)
}
