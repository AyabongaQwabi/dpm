'use server'

/**
 * Provider-side booking actions.
 *
 * These used to write `bookings.status` directly and hand-roll their own
 * status-history inserts. Every one of them now delegates to
 * transitionBooking(), which is the single writer of status in the
 * application — it validates the from-state and the actor, writes the audit
 * row, refunds credits on decline, and fires the lifecycle email.
 */

import { requireProviderSession } from '@/lib/session'
import { transitionBooking } from '@/lib/actions/booking-transitions'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { NUDGE_RATE_LIMIT_HOURS } from '@/lib/booking-lifecycle-config'
import { sendRequirementsNudge } from '@/lib/booking-emails'
import { recordBookingEvent } from '@/lib/actions/booking-transitions'

export async function acceptBooking(formData: FormData) {
  const { provider } = await requireProviderSession()
  const bookingId = formData.get('bookingId') as string

  await transitionBooking({
    bookingId,
    to: 'accepted',
    actorType: 'provider',
    actorId: provider.id,
  })

  revalidatePath('/provider-dashboard/messages', 'layout')
  redirect(`/provider-dashboard/bookings/${bookingId}`)
}

export async function declineBooking(formData: FormData) {
  const { provider } = await requireProviderSession()
  const bookingId = formData.get('bookingId') as string
  const reason =
    (formData.get('reason') as string | null)?.trim() || 'Declined by provider'

  // transitionBooking refunds the customer's credits via the existing
  // refundBookingCredits path — not duplicated here.
  await transitionBooking({
    bookingId,
    to: 'declined',
    actorType: 'provider',
    actorId: provider.id,
    note: reason,
  })

  revalidatePath('/provider-dashboard/messages', 'layout')
  redirect(`/provider-dashboard/bookings/${bookingId}`)
}

/** accepted → in_progress. */
export async function startWork(formData: FormData) {
  const { provider } = await requireProviderSession()
  const bookingId = formData.get('bookingId') as string

  await transitionBooking({
    bookingId,
    to: 'in_progress',
    actorType: 'provider',
    actorId: provider.id,
  })

  redirect(`/provider-dashboard/bookings/${bookingId}`)
}

/** accepted | in_progress → completed_by_provider. Never straight to completed. */
export async function markWorkComplete(formData: FormData) {
  const { provider } = await requireProviderSession()
  const bookingId = formData.get('bookingId') as string

  await transitionBooking({
    bookingId,
    to: 'completed_by_provider',
    actorType: 'provider',
    actorId: provider.id,
  })

  redirect(`/provider-dashboard/bookings/${bookingId}`)
}

/**
 * "Nudge customer" — reminder email for outstanding requirements.
 * Rate-limited to once per NUDGE_RATE_LIMIT_HOURS per booking, enforced
 * server-side against bookings.last_nudge_at.
 */
export async function nudgeCustomer(formData: FormData) {
  const { provider } = await requireProviderSession()
  const bookingId = formData.get('bookingId') as string

  const admin = createAdminClient()
  const { data: booking } = await admin
    .from('bookings')
    .select('id, provider_id, last_nudge_at')
    .eq('id', bookingId)
    .eq('provider_id', provider.id)
    .single()

  if (!booking) return

  const cutoff = Date.now() - NUDGE_RATE_LIMIT_HOURS * 60 * 60 * 1000
  if (booking.last_nudge_at && new Date(booking.last_nudge_at).getTime() > cutoff) {
    return
  }

  await admin
    .from('bookings')
    .update({ last_nudge_at: new Date().toISOString() })
    .eq('id', bookingId)

  await recordBookingEvent({
    bookingId,
    eventType: 'requirements_nudge',
    actorType: 'provider',
    actorId: provider.id,
    note: 'Reminder sent to customer',
  })

  void sendRequirementsNudge(bookingId)

  revalidatePath(`/provider-dashboard/bookings/${bookingId}`)
}
