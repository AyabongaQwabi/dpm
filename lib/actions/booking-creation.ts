'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { canAfford, shortfall } from '@/lib/domain/credits'
import { snapshotBookingRequirements } from '@/lib/actions/booking-requirements'
import { sendBookingCreatedEmails } from '@/lib/booking-emails'
import type { FullCommissionResult } from '@/lib/domain/payments'

export type CreateBookingWithCreditsResult =
  | { ok: true; bookingId: string }
  | { ok: false; reason: 'insufficient_credits'; shortfall: number }
  | { ok: false; reason: 'failed' }

export async function createBookingWithCredits(params: {
  customerId: string
  customerCreditBalance: number
  providerId: string
  serviceId: string
  packageId: string | null
  notes: string | null
  commission: FullCommissionResult
  description: string
}): Promise<CreateBookingWithCreditsResult> {
  const spendCredits = Math.round(params.commission.finalPrice)

  if (!canAfford(params.customerCreditBalance, spendCredits)) {
    return {
      ok: false,
      reason: 'insufficient_credits',
      shortfall: shortfall(params.customerCreditBalance, spendCredits),
    }
  }

  const admin = createAdminClient()
  const { data: bookingId, error } = await admin.rpc('create_booking_with_credit_spend', {
    p_customer_id: params.customerId,
    p_provider_id: params.providerId,
    p_service_id: params.serviceId,
    p_package_id: params.packageId,
    p_notes: params.notes,
    p_final_price: params.commission.finalPrice,
    p_commission_amount: params.commission.commissionAmount,
    p_provider_payout_amount: params.commission.providerPayoutAmount,
    p_spend_credits: spendCredits,
    p_description: params.description,
  })

  if (error || !bookingId) {
    console.error('Booking creation RPC failed:', error?.message)
    if (error?.message.includes('Insufficient credit')) {
      return {
        ok: false,
        reason: 'insufficient_credits',
        shortfall: shortfall(params.customerCreditBalance, spendCredits),
      }
    }
    return { ok: false, reason: 'failed' }
  }

  await admin.from('message_threads').insert({
    provider_id: params.providerId,
    customer_id: params.customerId,
    service_id: params.serviceId,
    booking_id: bookingId,
  })

  await snapshotBookingRequirements({
    bookingId,
    packageId: params.packageId,
  })

  void sendBookingCreatedEmails(bookingId)

  revalidatePath('/customer-account')
  revalidatePath('/customer-account/credits')
  revalidatePath('/customer-account/bookings')
  revalidatePath('/provider-dashboard/messages')
  revalidatePath('/provider-dashboard/sales')
  revalidatePath('/provider-dashboard/bookings')

  return { ok: true, bookingId }
}
