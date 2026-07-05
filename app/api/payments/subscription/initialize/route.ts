import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PACKAGES } from '@/lib/pricing-config'

export async function POST(request: Request) {
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

  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 503 })
  }

  const { data: userData } = await supabase.auth.getUser()
  const email = userData.user?.email
  if (!email) {
    return NextResponse.json({ error: 'Email required for payment' }, { status: 400 })
  }

  const fee = Number(subscription.monthly_fee) || PACKAGES[0].monthlyFee
  const origin = new URL(request.url).origin
  const callbackUrl = `${origin}/provider-dashboard/billing?status=success`

  const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: Math.round(fee * 100),
      currency: 'ZAR',
      callback_url: callbackUrl,
      metadata: {
        type: 'provider_subscription_renewal',
        provider_id: provider.id,
        subscription_id: subscription.id,
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
