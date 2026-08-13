import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadPlatformConfig } from '@/lib/platform-config'
import { getConfigNumber, CONFIG_KEYS } from '@/lib/domain/config'
import { transitionBooking } from '@/lib/actions/booking-transitions'
import {
  AUTO_COMPLETE_DAYS,
  AUTO_COMPLETE_ENABLED,
} from '@/lib/booking-lifecycle-config'

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const config = await loadPlatformConfig()
  const expiryHours = await getConfigNumber(config, CONFIG_KEYS.BOOKING_AUTO_EXPIRY_HOURS)

  const cutoff = new Date(Date.now() - expiryHours * 3_600_000).toISOString()

  const { data: staleBookings } = await admin
    .from('bookings')
    .select('id, customer_id, payment_status')
    .eq('status', 'requested')
    .lt('requested_at', cutoff)
    .limit(100)

  let processed = 0

  for (const booking of staleBookings ?? []) {
    // Routed through the single status writer: it refunds the credits via the
    // existing path and writes the audit row. No direct status update here.
    try {
      const result = await transitionBooking({
        bookingId: booking.id,
        to: 'declined',
        actorType: 'system',
        actorId: null,
        note: 'Auto-expired — provider did not respond in time',
      })
      if (result.ok && !result.noop) processed += 1
    } catch (err) {
      console.error('Auto-expiry failed for booking', booking.id, err)
    }
  }

  // ── Auto-completion sweep ──────────────────────────────────────────────
  //
  // Bookings sitting in completed_by_provider past the configured window.
  // Ships DISABLED: the window is TODO(aya): confirm, so until
  // config/booking-lifecycle.json sets autoComplete.enabled to true this
  // reports what it would have done and transitions nothing.

  const autoCompleteCutoff = new Date(
    Date.now() - AUTO_COMPLETE_DAYS * 24 * 3_600_000,
  ).toISOString()

  const { data: awaitingConfirmation } = await admin
    .from('bookings')
    .select('id')
    .eq('status', 'completed_by_provider')
    .lt('provider_completed_at', autoCompleteCutoff)
    .limit(100)

  const eligible = awaitingConfirmation ?? []
  let autoCompleted = 0

  if (AUTO_COMPLETE_ENABLED) {
    for (const booking of eligible) {
      try {
        const result = await transitionBooking({
          bookingId: booking.id,
          to: 'completed',
          actorType: 'system',
          actorId: null,
          note: `Auto-completed after ${AUTO_COMPLETE_DAYS} days without customer confirmation`,
        })
        if (result.ok && !result.noop) autoCompleted += 1
      } catch (err) {
        console.error('Auto-completion failed for booking', booking.id, err)
      }
    }
  }

  return NextResponse.json({
    processed,
    autoCompleted,
    autoCompleteEnabled: AUTO_COMPLETE_ENABLED,
    autoCompleteEligible: eligible.length,
  })
}
