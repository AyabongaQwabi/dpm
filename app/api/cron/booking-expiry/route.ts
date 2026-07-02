import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadConfigStore } from '@/lib/config-store'
import { getConfigNumber, CONFIG_KEYS } from '@/lib/domain/config'
import { refundBookingCredits } from '@/lib/actions/credits'

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
  const config = await loadConfigStore(admin)
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
    await admin.from('bookings').update({
      status: 'declined',
      cancellation_reason: 'Auto-expired — provider did not respond in time',
      updated_at: new Date().toISOString(),
    }).eq('id', booking.id)

    await admin.from('booking_status_history').insert({
      booking_id: booking.id,
      from_status: 'requested',
      to_status: 'declined',
      actor_type: 'system',
      actor_id: null,
    })

    if (booking.payment_status === 'captured') {
      await refundBookingCredits(booking.id)
    }

    processed += 1
  }

  return NextResponse.json({ processed })
}
