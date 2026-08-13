'use server'

/**
 * transitionBooking() — the ONLY place `bookings.status` is written.
 *
 * Every route, action and component goes through this function. It:
 *   1. re-reads the booking under the service-role client (never trusts a
 *      status the caller passed in),
 *   2. validates the move against the pure state machine in
 *      lib/domain/booking.ts (from-state, actor role, actor identity, note),
 *   3. writes the status plus its timestamp column,
 *   4. appends an audit row to booking_status_history (exposed as the
 *      booking_events view),
 *   5. runs the side effects that are *definitionally* part of the
 *      transition — credit refund on declined/cancelled, payout row on
 *      completed — reusing the existing live implementations,
 *   6. fires lifecycle email, fire-and-forget.
 *
 * Idempotency: the status update is conditional on the from-state
 * (`.eq('status', fromStatus)`), so a retried submit or a double-clicked form
 * updates zero rows the second time and the function returns early without
 * re-refunding, re-paying-out, or re-emailing.
 */

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  evaluateTransition,
  isRefundingStatus,
  BookingTransitionError,
  BookingAuthorizationError,
  type ActorType,
  type BookingStatus,
  type BookingRow,
} from '@/lib/domain/booking'
import { refundBookingCredits } from '@/lib/actions/credits'
import { sendBookingLifecycleEmail } from '@/lib/booking-emails'

export interface TransitionOutcome {
  ok: boolean
  /** Present when ok === false. Safe to surface to the acting user. */
  error?: string
  /** True when the booking was already in the target state (retry/replay). */
  noop?: boolean
}

/** Column that records when each status was reached. */
const STATUS_TIMESTAMP_COLUMN: Partial<Record<BookingStatus, string>> = {
  in_progress: 'started_at',
  completed_by_provider: 'provider_completed_at',
  completed: 'completed_at',
  disputed: 'disputed_at',
}

export async function transitionBooking(params: {
  bookingId: string
  to: BookingStatus
  actorType: ActorType
  /** The provider id / customer id acting. Null only for system actors. */
  actorId: string | null
  note?: string | null
}): Promise<TransitionOutcome> {
  const { bookingId, to, actorType, actorId, note = null } = params
  const admin = createAdminClient()

  const { data: row } = await admin
    .from('bookings')
    .select(
      'id, provider_id, customer_id, service_id, status, payment_status, cancellation_reason, requested_at, provider_completed_at, final_price, commission_amount, provider_payout_amount',
    )
    .eq('id', bookingId)
    .single()

  if (!row) return { ok: false, error: 'Booking not found.' }

  // Already there — treat as a successful no-op so retries are safe.
  if (row.status === to) return { ok: true, noop: true }

  const booking: BookingRow = {
    id: row.id,
    providerId: row.provider_id,
    customerId: row.customer_id,
    status: row.status as BookingStatus,
    paymentStatus: row.payment_status,
    cancellationReason: row.cancellation_reason,
    requestedAt: new Date(row.requested_at),
    providerCompletedAt: row.provider_completed_at
      ? new Date(row.provider_completed_at)
      : null,
  }

  let result
  try {
    result = evaluateTransition(booking, to, actorType, actorId, note)
  } catch (err) {
    if (
      err instanceof BookingTransitionError ||
      err instanceof BookingAuthorizationError
    ) {
      return { ok: false, error: err.message }
    }
    throw err
  }

  const nowIso = new Date().toISOString()
  const update: Record<string, unknown> = {
    status: to,
    updated_at: nowIso,
  }

  const tsColumn = STATUS_TIMESTAMP_COLUMN[to]
  if (tsColumn) update[tsColumn] = nowIso

  const trimmedNote = note?.trim() || null
  if (to === 'cancelled' || to === 'declined') {
    update.cancellation_reason = trimmedNote ?? 'No reason given'
  }
  if (to === 'disputed') {
    update.dispute_reason = trimmedNote
  }

  // Conditional on the from-state: this is what makes concurrent/retried
  // submits safe. A second identical call matches zero rows.
  const { data: updated } = await admin
    .from('bookings')
    .update(update)
    .eq('id', bookingId)
    .eq('status', booking.status)
    .select('id')

  if (!updated || updated.length === 0) {
    // Someone else moved it first. Not an error the user needs to see as a
    // failure — re-read and report accurately.
    return { ok: true, noop: true }
  }

  await admin.from('booking_status_history').insert({
    booking_id: bookingId,
    from_status: result.historyEntry.fromStatus,
    to_status: result.historyEntry.toStatus,
    actor_type: result.historyEntry.actorType,
    actor_id: result.historyEntry.actorId,
    event_type: 'status_change',
    note: trimmedNote,
  })

  // ── Side effects that are part of the transition's definition ────────────

  if (isRefundingStatus(to)) {
    // Reuses the existing live refund path (idempotent per booking at the RPC
    // level via credit_transactions_refund_per_booking). Never re-implemented.
    await refundBookingCredits(bookingId)
  }

  if (to === 'completed') {
    await recordPayout(row)
  }

  // Fire-and-forget: a Resend failure must never roll back the transition.
  void sendBookingLifecycleEmail({ bookingId, status: to, note: trimmedNote })

  revalidateBookingSurfaces(bookingId)

  return { ok: true }
}

/**
 * Payout row on completion. Commission is taken from the amounts computed and
 * frozen at booking time (which themselves came from the bracket config via
 * calculateBookingCommission) — not recomputed here, so a later config change
 * cannot retroactively alter an agreed price.
 *
 * upsert on booking_id (UNIQUE) makes this idempotent.
 */
async function recordPayout(row: {
  id: string
  provider_id: string
  final_price: number
  commission_amount: number
  provider_payout_amount: number
}) {
  const admin = createAdminClient()
  await admin.from('provider_payouts').upsert(
    {
      booking_id: row.id,
      provider_id: row.provider_id,
      gross_amount: Math.round(Number(row.final_price)),
      commission_amount: Math.round(Number(row.commission_amount)),
      net_payout_amount: Math.round(Number(row.provider_payout_amount)),
      status: 'pending',
    },
    { onConflict: 'booking_id' },
  )
}

function revalidateBookingSurfaces(bookingId: string) {
  revalidatePath('/customer-account', 'layout')
  revalidatePath(`/customer-account/bookings/${bookingId}`)
  revalidatePath('/provider-dashboard/sales')
  revalidatePath('/provider-dashboard/bookings')
  revalidatePath(`/provider-dashboard/bookings/${bookingId}`)
}

/**
 * Append a non-status event to the timeline (file uploads, downloads, nudges).
 * to_status repeats the current status because the existing table's
 * to_status is NOT NULL and that constraint is not ours to relax.
 */
export async function recordBookingEvent(params: {
  bookingId: string
  eventType: string
  actorType: ActorType
  actorId: string | null
  note?: string | null
}): Promise<void> {
  const admin = createAdminClient()

  const { data: booking } = await admin
    .from('bookings')
    .select('status')
    .eq('id', params.bookingId)
    .single()

  if (!booking) return

  await admin.from('booking_status_history').insert({
    booking_id: params.bookingId,
    from_status: booking.status,
    to_status: booking.status,
    actor_type: params.actorType,
    actor_id: params.actorId,
    event_type: params.eventType,
    note: params.note ?? null,
  })
}
