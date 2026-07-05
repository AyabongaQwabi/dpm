import { createAdminClient } from '@/lib/supabase/admin'
import { addOneMonth, buildBaseSubscriptionRow } from '@/lib/domain/subscriptions'

export async function ensureBaseSubscription(providerId: string): Promise<void> {
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('provider_subscriptions')
    .select('id')
    .eq('provider_id', providerId)
    .eq('status', 'active')
    .maybeSingle()

  if (existing) return

  const row = buildBaseSubscriptionRow(providerId)
  const { error } = await admin.from('provider_subscriptions').insert(row)

  if (error) {
    console.error('ensureBaseSubscription:', error.message)
  }
}

export async function renewProviderSubscription(
  providerId: string,
  subscriptionId: string,
  paystackRef: string,
): Promise<{ renewed: boolean; alreadyApplied: boolean }> {
  const admin = createAdminClient()

  const { data: sub } = await admin
    .from('provider_subscriptions')
    .select('id, billing_end, last_renewal_paystack_ref, status')
    .eq('id', subscriptionId)
    .eq('provider_id', providerId)
    .single()

  if (!sub) return { renewed: false, alreadyApplied: false }

  if (sub.last_renewal_paystack_ref === paystackRef) {
    return { renewed: false, alreadyApplied: true }
  }

  const base = sub.status === 'active' ? new Date(sub.billing_end) : new Date()
  const newEnd = addOneMonth(base)

  const { error: subError } = await admin
    .from('provider_subscriptions')
    .update({
      status: 'active',
      billing_end: newEnd.toISOString(),
      last_renewal_paystack_ref: paystackRef,
    })
    .eq('id', subscriptionId)

  if (subError) {
    if (subError.code === '23505') {
      return { renewed: false, alreadyApplied: true }
    }
    console.error('renewProviderSubscription:', subError.message)
    return { renewed: false, alreadyApplied: false }
  }

  await admin.from('providers').update({ is_published: true }).eq('id', providerId)

  return { renewed: true, alreadyApplied: false }
}
