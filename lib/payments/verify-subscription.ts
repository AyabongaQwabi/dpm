import { createAdminClient } from '@/lib/supabase/admin'

export type CheckSubscriptionResult = {
  renewed: boolean
}

/**
 * Checks whether the Yoco webhook has already applied this subscription
 * renewal. Yoco's Checkout API has no verify-by-reference endpoint, so
 * app/api/webhooks/yoco/route.ts (via renewProviderSubscription) is the sole
 * writer of provider_subscriptions.last_renewal_yoco_ref — this just reads
 * what it wrote. `renewed: false` means "not yet" (webhook may still be in
 * flight), not "failed".
 */
export async function checkSubscriptionRenewed(
  reference: string,
  providerId: string,
): Promise<CheckSubscriptionResult> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('provider_subscriptions')
    .select('id')
    .eq('provider_id', providerId)
    .eq('last_renewal_yoco_ref', reference)
    .maybeSingle()

  return { renewed: !!data }
}

/**
 * Same dedupe check as checkSubscriptionRenewed, for the
 * provider_subscription_upgrade webhook path (package selected at signup or
 * upgraded later from billing).
 */
export async function checkSubscriptionUpgraded(
  reference: string,
  providerId: string,
): Promise<CheckSubscriptionResult> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('provider_subscriptions')
    .select('id')
    .eq('provider_id', providerId)
    .eq('last_renewal_yoco_ref', reference)
    .maybeSingle()

  return { renewed: !!data }
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
