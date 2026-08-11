import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertPositiveCredits } from '@/lib/domain/credits'
import {
  PROVIDER_WALLET_MAX_TOP_UP_CREDITS,
  PROVIDER_WALLET_MIN_TOP_UP_CREDITS,
} from '@/lib/provider-wallet-config'
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

  const { data: provider } = await supabase
    .from('providers')
    .select('id, business_name')
    .eq('auth_provider_id', user.id)
    .single()

  if (!provider) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
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

  if (amount < PROVIDER_WALLET_MIN_TOP_UP_CREDITS || amount > PROVIDER_WALLET_MAX_TOP_UP_CREDITS) {
    return NextResponse.json(
      {
        error: `Amount must be between ${PROVIDER_WALLET_MIN_TOP_UP_CREDITS} and ${PROVIDER_WALLET_MAX_TOP_UP_CREDITS} credits`,
      },
      { status: 400 },
    )
  }

  const origin = new URL(request.url).origin
  const reference = randomPaymentReference()

  const result = await createYocoCheckout({
    amountInCents: amount * 100,
    successUrl: `${origin}/provider-dashboard/billing?status=success&reference=${reference}`,
    cancelUrl: `${origin}/provider-dashboard/billing?status=cancelled`,
    failureUrl: `${origin}/provider-dashboard/billing?status=failed`,
    metadata: {
      type: 'provider_wallet_topup',
      reference,
      provider_id: provider.id,
      credit_amount: amount,
    },
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  return NextResponse.json({ redirect_url: result.redirectUrl })
}
