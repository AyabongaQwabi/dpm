import { createAdminClient } from '@/lib/supabase/admin'
import { getPromotionById } from '@/lib/credit-promotions'
import {
  isValidCreditPurchaseVerification,
  parseCreditPurchaseMetadata,
  type CreditPurchaseMetadata,
} from '@/lib/domain/credits'

export type VerifyCreditsResult = {
  credited: boolean
  balance: number
  alreadyApplied?: boolean
  totalCredits?: number
  verified: boolean
}

type PaystackVerifyResponse = {
  status?: boolean
  data?: {
    status?: string
    reference?: string
    metadata?: CreditPurchaseMetadata
  }
}

async function fetchCustomerBalance(customerId: string): Promise<number> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('customers')
    .select('credit_balance')
    .eq('id', customerId)
    .single()

  return data?.credit_balance ?? 0
}

/**
 * Verify a Paystack credit purchase and apply credits via credit_wallet_purchase.
 *
 * Idempotency: credit_transactions.paystack_ref has a partial UNIQUE index
 * (see 20260702000000_credit_wallet.sql), and credit_wallet_purchase returns
 * early when the reference already exists — safe to call from webhook and return URL.
 */
export async function verifyAndApplyCredits(
  reference: string,
  customerId: string,
): Promise<VerifyCreditsResult> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    const balance = await fetchCustomerBalance(customerId)
    return { credited: false, balance, verified: false }
  }

  const paystackRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secretKey}` },
    },
  )

  const paystackData = (await paystackRes.json()) as PaystackVerifyResponse
  const metadata = paystackData.data?.metadata ?? {}
  const paystackStatus = paystackData.data?.status ?? ''

  if (
    !paystackRes.ok
    || !paystackData.status
    || !isValidCreditPurchaseVerification(paystackStatus, metadata, customerId)
  ) {
    const balance = await fetchCustomerBalance(customerId)
    return { credited: false, balance, verified: false }
  }

  const { baseCredits, bonusCredits, totalCredits } = parseCreditPurchaseMetadata(metadata)
  const promotionId = metadata.promotion_id ?? null
  const admin = createAdminClient()

  const { data: existingTx } = await admin
    .from('credit_transactions')
    .select('id')
    .eq('paystack_ref', reference)
    .maybeSingle()

  if (existingTx) {
    const balance = await fetchCustomerBalance(customerId)
    return { credited: false, balance, alreadyApplied: true, totalCredits, verified: true }
  }

  const promotion = promotionId ? getPromotionById(promotionId) : null
  const promotionName = promotion?.name ?? 'bonus'
  const description = bonusCredits > 0
    ? `Credit purchase: ${baseCredits} + ${bonusCredits} bonus (${promotionName})`
    : `Credit purchase (${reference})`

  const { error } = await admin.rpc('credit_wallet_purchase', {
    p_customer_id: customerId,
    p_amount: baseCredits,
    p_paystack_ref: reference,
    p_description: description,
    p_bonus_credits: bonusCredits > 0 ? bonusCredits : 0,
    p_promotion_id: promotionId,
  })

  if (error) {
    // Race with webhook — unique index on paystack_ref makes duplicate inserts safe.
    if (error.code === '23505') {
      const balance = await fetchCustomerBalance(customerId)
      return { credited: false, balance, alreadyApplied: true, totalCredits, verified: true }
    }

    console.error('credit_wallet_purchase failed:', error.message)
    const balance = await fetchCustomerBalance(customerId)
    return { credited: false, balance, verified: false }
  }

  const balance = await fetchCustomerBalance(customerId)
  return { credited: true, balance, totalCredits, verified: true }
}
