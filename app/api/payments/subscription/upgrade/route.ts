import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPackage } from '@/lib/pricing-config'
import { buildBaseSubscriptionRow } from '@/lib/domain/subscriptions'
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

  let body: { packageNumber?: number; returnPath?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const packageNumber = body.packageNumber
  if (!packageNumber || packageNumber < 2 || packageNumber > 5 || !Number.isInteger(packageNumber)) {
    return NextResponse.json({ error: 'packageNumber must be 2-5' }, { status: 400 })
  }

  const pkg = getPackage(packageNumber as 2 | 3 | 4 | 5)

  // A provider paying for a package for the very first time (straight from
  // onboarding) has no provider_subscriptions row yet — ensure the base row
  // exists first so applyProviderSubscriptionUpgrade (webhook-side) has an
  // active row to update in place, honoring the one-active-row-per-provider
  // constraint instead of trying to insert a second active row.
  const admin = createAdminClient()
  const { data: existingActive } = await admin
    .from('provider_subscriptions')
    .select('id')
    .eq('provider_id', provider.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!existingActive) {
    const { error: insertError } = await admin
      .from('provider_subscriptions')
      .insert(buildBaseSubscriptionRow(provider.id))
    if (insertError) {
      console.error('subscription/upgrade base row insert:', insertError.message)
      return NextResponse.json({ error: 'Could not prepare subscription' }, { status: 500 })
    }
  }

  const origin = new URL(request.url).origin
  const reference = randomPaymentReference()
  const returnPath = body.returnPath ?? '/provider-dashboard/billing'

  const result = await createYocoCheckout({
    amountInCents: Math.round(pkg.monthlyFee * 100),
    successUrl: `${origin}${returnPath}?status=success&reference=${reference}&package=${pkg.packageNumber}`,
    cancelUrl: `${origin}${returnPath}?status=cancelled`,
    failureUrl: `${origin}${returnPath}?status=failed`,
    metadata: {
      type: 'provider_subscription_upgrade',
      provider_id: provider.id,
      package_number: pkg.packageNumber,
      reference,
    },
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  return NextResponse.json({ redirect_url: result.redirectUrl })
}
