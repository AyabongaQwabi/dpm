import { createAdminClient } from '@/lib/supabase/admin'
import { renewProviderSubscription } from '@/lib/actions/subscriptions'

export type VerifySubscriptionResult = {
  renewed: boolean
  alreadyApplied?: boolean
  verified: boolean
}

type SubscriptionRenewalMetadata = {
  type?: string
  provider_id?: string
  subscription_id?: string
}

function isValidRenewalMetadata(
  metadata: SubscriptionRenewalMetadata,
  providerId: string,
): boolean {
  return (
    metadata.type === 'provider_subscription_renewal'
    && metadata.provider_id === providerId
    && typeof metadata.subscription_id === 'string'
    && metadata.subscription_id.length > 0
  )
}

/**
 * Verify Paystack subscription renewal and extend billing period.
 * Idempotent via provider_subscriptions.last_renewal_paystack_ref UNIQUE.
 */
export async function verifyAndApplySubscriptionRenewal(
  reference: string,
  providerId: string,
): Promise<VerifySubscriptionResult> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    return { renewed: false, verified: false }
  }

  const paystackRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  )

  const paystackData = await paystackRes.json() as {
    status?: boolean
    data?: {
      status?: string
      reference?: string
      metadata?: SubscriptionRenewalMetadata
    }
  }

  const metadata = paystackData.data?.metadata ?? {}
  const paystackStatus = paystackData.data?.status ?? ''

  if (
    !paystackRes.ok
    || !paystackData.status
    || paystackStatus !== 'success'
    || !isValidRenewalMetadata(metadata, providerId)
  ) {
    return { renewed: false, verified: false }
  }

  const result = await renewProviderSubscription(
    providerId,
    metadata.subscription_id!,
    reference,
  )

  return {
    renewed: result.renewed,
    alreadyApplied: result.alreadyApplied,
    verified: true,
  }
}

export async function getProviderAuthEmail(providerId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data: provider } = await admin
    .from('providers')
    .select('auth_provider_id')
    .eq('id', providerId)
    .single()

  if (!provider?.auth_provider_id) return null

  const { data: userData } = await admin.auth.admin.getUserById(provider.auth_provider_id)
  return userData?.user?.email ?? null
}
