import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPromotionById } from '@/lib/credit-promotions'
import { renewProviderSubscription, applyProviderSubscriptionUpgrade } from '@/lib/actions/subscriptions'
import { verifyYocoWebhookSignature, type YocoWebhookEvent } from '@/lib/payments/yoco'
import { parseCreditPurchaseMetadata } from '@/lib/domain/credits'

export async function POST(request: Request) {
  const secret = process.env.YOCO_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const rawBody = await request.text()
  const valid = verifyYocoWebhookSignature({
    rawBody,
    webhookId: request.headers.get('webhook-id'),
    webhookTimestamp: request.headers.get('webhook-timestamp'),
    webhookSignature: request.headers.get('webhook-signature'),
    secret,
  })

  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: YocoWebhookEvent
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  if (event.type !== 'payment.succeeded') {
    return NextResponse.json({ received: true })
  }

  const metadata = event.payload?.metadata ?? {}
  // Our own reference (generated at checkout creation, threaded through
  // metadata and the successUrl) — not Yoco's payload.id. This is what the
  // return page polls for, since Yoco has no verify-by-id endpoint.
  const reference = metadata.reference

  if (metadata.type === 'provider_subscription_renewal') {
    const providerId = metadata.provider_id
    const subscriptionId = metadata.subscription_id
    if (!providerId || !subscriptionId || !reference) {
      return NextResponse.json({ error: 'Missing subscription metadata' }, { status: 400 })
    }
    await renewProviderSubscription(providerId, subscriptionId, reference)
    return NextResponse.json({ received: true })
  }

  if (metadata.type === 'provider_subscription_upgrade') {
    const providerId = metadata.provider_id
    const packageNumber = Number(metadata.package_number)
    if (!providerId || !reference || !Number.isInteger(packageNumber) || packageNumber < 1 || packageNumber > 5) {
      return NextResponse.json({ error: 'Missing upgrade metadata' }, { status: 400 })
    }
    await applyProviderSubscriptionUpgrade(providerId, packageNumber as 1 | 2 | 3 | 4 | 5, reference)
    return NextResponse.json({ received: true })
  }

  if (metadata.type !== 'credit_purchase') {
    return NextResponse.json({ received: true })
  }

  const customerId = metadata.customer_id
  const { baseCredits, bonusCredits } = parseCreditPurchaseMetadata(metadata)
  const promotionId = metadata.promotion_id ?? null

  if (!customerId || !reference || !Number.isFinite(baseCredits) || baseCredits <= 0) {
    return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
  }

  const promotion = promotionId ? getPromotionById(promotionId) : null
  const promotionName = promotion?.name ?? 'bonus'
  const description = bonusCredits > 0
    ? `Credit purchase: ${baseCredits} + ${bonusCredits} bonus (${promotionName})`
    : `Credit purchase (${reference})`

  const admin = createAdminClient()
  const { error } = await admin.rpc('credit_wallet_purchase', {
    p_customer_id: customerId,
    p_amount: baseCredits,
    p_yoco_ref: reference,
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
