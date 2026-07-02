import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPromotionById } from '@/lib/credit-promotions'

function verifyPaystackSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false
  const hash = createHmac('sha512', secret).update(rawBody).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(signature))
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('x-paystack-signature')

  if (!verifyPaystackSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: {
    event?: string
    data?: {
      reference?: string
      metadata?: {
        type?: string
        customer_id?: string
        credit_amount?: number | string
        bonus_credits?: number | string
        promotion_id?: string | null
      }
    }
  }

  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  if (event.event !== 'charge.success') {
    return NextResponse.json({ received: true })
  }

  const metadata = event.data?.metadata
  if (metadata?.type !== 'credit_purchase') {
    return NextResponse.json({ received: true })
  }

  const customerId = metadata.customer_id
  const paystackRef = event.data?.reference
  const amount = Math.round(Number(metadata.credit_amount))
  const bonusCredits = Math.round(Number(metadata.bonus_credits ?? 0))
  const promotionId = metadata.promotion_id ?? null

  if (!customerId || !paystackRef || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
  }

  const promotion = promotionId ? getPromotionById(promotionId) : null
  const promotionName = promotion?.name ?? 'bonus'
  const description = bonusCredits > 0
    ? `Credit purchase: ${amount} + ${bonusCredits} bonus (${promotionName})`
    : `Credit purchase (${paystackRef})`

  const admin = createAdminClient()
  const { error } = await admin.rpc('credit_wallet_purchase', {
    p_customer_id: customerId,
    p_amount: amount,
    p_paystack_ref: paystackRef,
    p_description: description,
    p_bonus_credits: bonusCredits > 0 ? bonusCredits : 0,
    p_promotion_id: promotionId,
  })

  if (error) {
    console.error('credit_wallet_purchase failed:', error.message)
    return NextResponse.json({ error: 'Wallet update failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
