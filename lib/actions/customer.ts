'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCustomerSession } from '@/lib/session'
import { refundBookingCredits } from '@/lib/actions/credits'

// ── Helpers ──────────────────────────────────────────────────────────────────

function revalidateAll() {
  revalidatePath('/customer-account', 'layout')
}

// ── Booking: cancel (requested state only — customer right per BOOK-LOGIC-002) ──

export async function cancelBooking(formData: FormData) {
  const { customer } = await requireCustomerSession()
  const bookingId = formData.get('bookingId') as string
  const reason = (formData.get('reason') as string | null)?.trim() || 'Cancelled by customer'

  const supabase = await createClient()
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, customer_id, payment_status')
    .eq('id', bookingId)
    .eq('customer_id', customer.id)
    .single()

  if (!booking || booking.status !== 'requested') return

  const admin = createAdminClient()
  await admin.from('bookings').update({
    status: 'cancelled',
    cancellation_reason: reason,
    updated_at: new Date().toISOString(),
  }).eq('id', bookingId)

  await admin.from('booking_status_history').insert({
    booking_id: bookingId,
    from_status: 'requested',
    to_status: 'cancelled',
    actor_type: 'customer',
    actor_id: customer.id,
  })

  if (booking.payment_status === 'captured') {
    await refundBookingCredits(bookingId)
  }

  revalidateAll()
}

// ── Booking: confirm completion (customer acknowledges provider's completed mark) ──
// This moves the booking to 'completed' — triggers commission per spec.

export async function confirmCompletion(formData: FormData) {
  const { customer } = await requireCustomerSession()
  const bookingId = formData.get('bookingId') as string

  const supabase = await createClient()
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, customer_id, provider_id, final_price, commission_amount, provider_payout_amount, payment_status')
    .eq('id', bookingId)
    .eq('customer_id', customer.id)
    .single()

  // Only allow confirming accepted bookings (provider has done the work)
  if (!booking || booking.status !== 'accepted') return
  if (booking.payment_status !== 'captured') return

  const admin = createAdminClient()
  await admin.from('bookings').update({
    status: 'completed',
    updated_at: new Date().toISOString(),
  }).eq('id', bookingId)

  await admin.from('booking_status_history').insert({
    booking_id: bookingId,
    from_status: 'accepted',
    to_status: 'completed',
    actor_type: 'customer',
    actor_id: customer.id,
  })

  const gross = Math.round(Number(booking.final_price))
  const commission = Math.round(Number(booking.commission_amount))
  const net = Math.round(Number(booking.provider_payout_amount))

  await admin.from('provider_payouts').upsert(
    {
      booking_id: bookingId,
      provider_id: booking.provider_id,
      gross_amount: gross,
      commission_amount: commission,
      net_payout_amount: net,
      status: 'pending',
    },
    { onConflict: 'booking_id' },
  )

  revalidateAll()
  redirect('/customer-account/reviews')
}

// ── Booking: dispute (soft flag — booking cancelled with __dispute__ reason) ──

export async function disputeBooking(formData: FormData) {
  const { customer } = await requireCustomerSession()
  const bookingId = formData.get('bookingId') as string

  const supabase = await createClient()
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, customer_id')
    .eq('id', bookingId)
    .eq('customer_id', customer.id)
    .single()

  if (!booking || !['requested', 'accepted'].includes(booking.status)) return

  const admin = createAdminClient()
  await admin.from('bookings').update({
    status: 'cancelled',
    cancellation_reason: '__dispute__',
    updated_at: new Date().toISOString(),
  }).eq('id', bookingId)

  await admin.from('booking_status_history').insert({
    booking_id: bookingId,
    from_status: booking.status,
    to_status: 'cancelled',
    actor_type: 'customer',
    actor_id: customer.id,
  })

  // No auto-refund on accepted disputes — work may have started; support handles manually.

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

  if (!bookingId || !comment || rating < 1 || rating > 5) return

  const supabase = await createClient()

  // Gate: booking must be completed and belong to this customer (REV-001)
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, provider_id, customer_id')
    .eq('id', bookingId)
    .eq('customer_id', customer.id)
    .eq('status', 'completed')
    .single()

  if (!booking) return

  // Gate: no duplicate review
  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('booking_id', bookingId)
    .single()

  if (existing) return

  const admin = createAdminClient()
  await admin.from('reviews').insert({
    booking_id: bookingId,
    provider_id: booking.provider_id,
    customer_id: customer.id,
    service_id: serviceId || null,
    package_id: packageId,
    rating,
    comment,
  })

  revalidateAll()
  redirect('/customer-account/reviews')
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
