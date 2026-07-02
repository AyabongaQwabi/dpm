import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadConfigStore } from '@/lib/config-store'
import { getConfigNumber, CONFIG_KEYS } from '@/lib/domain/config'
import { assertPositiveCredits } from '@/lib/domain/credits'
import { calculatePurchaseCredits } from '@/lib/credit-promotions'

export async function POST(request: Request) {
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

  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 503 })
  }

  const { baseCredits, bonusCredits, promotion } = calculatePurchaseCredits(amount)

  const origin = new URL(request.url).origin
  const callbackUrl = `${origin}/customer-account/credits?status=success`

  const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: customer.email,
      amount: baseCredits * 100,
      currency: 'ZAR',
      callback_url: callbackUrl,
      metadata: {
        type: 'credit_purchase',
        customer_id: customer.id,
        credit_amount: baseCredits,
        bonus_credits: bonusCredits,
        promotion_id: promotion?.id ?? null,
      },
    }),
  })

  const paystackData = await paystackRes.json() as {
    status?: boolean
    message?: string
    data?: { authorization_url?: string }
  }

  if (!paystackRes.ok || !paystackData.status || !paystackData.data?.authorization_url) {
    return NextResponse.json(
      { error: paystackData.message ?? 'Failed to initialize payment' },
      { status: 502 },
    )
  }

  return NextResponse.json({ authorization_url: paystackData.data.authorization_url })
}
