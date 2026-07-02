'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { requireCustomerSession } from '@/lib/session'

/** Refund captured booking credits to the customer wallet. Idempotent per booking. */
export async function refundBookingCredits(bookingId: string): Promise<boolean> {
  const admin = createAdminClient()

  const { data: booking } = await admin
    .from('bookings')
    .select('id, customer_id, final_price, payment_status, status')
    .eq('id', bookingId)
    .single()

  if (!booking || booking.payment_status !== 'captured') return false

  const refundAmount = Math.round(Number(booking.final_price))
  if (refundAmount <= 0) return false

  const { error: rpcError } = await admin.rpc('credit_wallet_refund', {
    p_customer_id: booking.customer_id,
    p_amount: refundAmount,
    p_booking_id: bookingId,
    p_description: `Refund for booking ${bookingId.slice(0, 8)}`,
  })

  if (rpcError) {
    console.error('credit_wallet_refund failed:', rpcError.message)
    return false
  }

  await admin.from('bookings').update({
    payment_status: 'refunded',
    updated_at: new Date().toISOString(),
  }).eq('id', bookingId)

  revalidatePath('/customer-account', 'layout')
  revalidatePath('/customer-account/credits')
  revalidatePath('/provider-dashboard/sales')

  return true
}

/** Load customer credit balance for server components. */
export async function getCustomerCreditBalance(customerId: string): Promise<number> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('customers')
    .select('credit_balance')
    .eq('id', customerId)
    .single()

  return data?.credit_balance ?? 0
}

/** Ensure session customer can access booking refund paths. */
export async function assertCustomerOwnsBooking(bookingId: string, customerId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('bookings')
    .select('id')
    .eq('id', bookingId)
    .eq('customer_id', customerId)
    .single()

  return !!data
}

/** Guard for server actions that need authenticated customer context. */
export async function requireCustomerForRefund() {
  return requireCustomerSession()
}
