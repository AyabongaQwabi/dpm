import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadConfigStore } from '@/lib/config-store'
import { getConfigNumber, CONFIG_KEYS } from '@/lib/domain/config'
import { assertPositiveCredits } from '@/lib/domain/credits'
import { calculatePurchaseCredits } from '@/lib/credit-promotions'
import { createYocoCheckout, randomPaymentReference } from '@/lib/payments/yoco'
import { isFeaturePaused, getFeaturePauseMessage } from '@/lib/feature-pauses'

export async function POST(request: Request) {
  if (isFeaturePaused('purchases')) {
    return NextResponse.json({ error: getFeaturePauseMessage('purchases'), paused: true }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: customer } = await supabase
    .from('customers')
    .select('id, email')
    .eq('auth_provider_id', user.id)
    .single()

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  let body: { amount?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const amount = Math.round(Number(body.amount))
  if (!Number.isFinite(amount)) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  try {
    assertPositiveCredits(amount)
  } catch {
    return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
  }

  const config = await loadConfigStore(supabase)
  const [minAmount, maxAmount] = await Promise.all([
    getConfigNumber(config, CONFIG_KEYS.CREDIT_PURCHASE_MIN),
    getConfigNumber(config, CONFIG_KEYS.CREDIT_PURCHASE_MAX),
  ])

  if (amount < minAmount || amount > maxAmount) {
    return NextResponse.json(
      { error: `Amount must be between ${minAmount} and ${maxAmount} credits` },
      { status: 400 },
    )
  }

  const { baseCredits, bonusCredits, promotion } = calculatePurchaseCredits(amount)

  const origin = new URL(request.url).origin
  const reference = randomPaymentReference()

  const result = await createYocoCheckout({
    amountInCents: baseCredits * 100,
    successUrl: `${origin}/customer-account/credits?status=success&reference=${reference}`,
    cancelUrl: `${origin}/customer-account/credits?status=cancelled`,
    failureUrl: `${origin}/customer-account/credits?status=failed`,
    metadata: {
      type: 'credit_purchase',
      reference,
      customer_id: customer.id,
      credit_amount: baseCredits,
      bonus_credits: bonusCredits,
      promotion_id: promotion?.id ?? null,
    },
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  return NextResponse.json({ redirect_url: result.redirectUrl })
}
