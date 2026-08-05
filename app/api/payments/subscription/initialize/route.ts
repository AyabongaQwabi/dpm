import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PACKAGES } from '@/lib/pricing-config'
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
    .select('id')
    .eq('auth_provider_id', user.id)
    .single()

  if (!provider) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
  }

  let body: { subscriptionId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const subscriptionId = body.subscriptionId
  if (!subscriptionId) {
    return NextResponse.json({ error: 'subscriptionId required' }, { status: 400 })
  }

  const { data: subscription } = await supabase
    .from('provider_subscriptions')
    .select('id, provider_id, monthly_fee')
    .eq('id', subscriptionId)
    .eq('provider_id', provider.id)
    .single()

  if (!subscription) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
  }

  const fee = Number(subscription.monthly_fee) || PACKAGES[0].monthlyFee
  const origin = new URL(request.url).origin
  const reference = randomPaymentReference()

  const result = await createYocoCheckout({
    amountInCents: Math.round(fee * 100),
    successUrl: `${origin}/provider-dashboard/billing?status=success&reference=${reference}`,
    cancelUrl: `${origin}/provider-dashboard/billing?status=cancelled`,
    failureUrl: `${origin}/provider-dashboard/billing?status=failed`,
    metadata: {
      type: 'provider_subscription_renewal',
      provider_id: provider.id,
      subscription_id: subscription.id,
      reference,
    },
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  return NextResponse.json({ redirect_url: result.redirectUrl })
}
