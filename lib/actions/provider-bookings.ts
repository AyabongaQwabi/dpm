'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireProviderSession } from '@/lib/session'
import { refundBookingCredits } from '@/lib/actions/credits'

async function insertStatusHistory(
  bookingId: string,
  fromStatus: string,
  toStatus: string,
  providerId: string,
) {
  const admin = createAdminClient()
  await admin.from('booking_status_history').insert({
    booking_id: bookingId,
    from_status: fromStatus,
    to_status: toStatus,
    actor_type: 'provider',
    actor_id: providerId,
  })
}

export async function acceptBooking(formData: FormData) {
  const { provider } = await requireProviderSession()
  const bookingId = formData.get('bookingId') as string

  const supabase = await createClient()
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, provider_id')
    .eq('id', bookingId)
    .eq('provider_id', provider.id)
    .single()

  if (!booking || booking.status !== 'requested') return

  const admin = createAdminClient()
  await admin.from('bookings').update({
    status: 'accepted',
    updated_at: new Date().toISOString(),
  }).eq('id', bookingId)

  await insertStatusHistory(bookingId, 'requested', 'accepted', provider.id)

  revalidatePath('/provider-dashboard/messages', 'layout')
  revalidatePath('/provider-dashboard/sales')
  revalidatePath('/customer-account/bookings')
}

export async function declineBooking(formData: FormData) {
  const { provider } = await requireProviderSession()
  const bookingId = formData.get('bookingId') as string
  const reason = (formData.get('reason') as string | null)?.trim() || 'Declined by provider'

  const supabase = await createClient()
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, provider_id, payment_status')
    .eq('id', bookingId)
    .eq('provider_id', provider.id)
    .single()

  if (!booking || booking.status !== 'requested') return

  const admin = createAdminClient()
  await admin.from('bookings').update({
    status: 'declined',
    cancellation_reason: reason,
    updated_at: new Date().toISOString(),
  }).eq('id', bookingId)

  await insertStatusHistory(bookingId, 'requested', 'declined', provider.id)

  if (booking.payment_status === 'captured') {
    await refundBookingCredits(bookingId)
  }

  revalidatePath('/provider-dashboard/messages', 'layout')
  revalidatePath('/provider-dashboard/sales')
  revalidatePath('/customer-account/bookings')
}
