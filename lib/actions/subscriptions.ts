import { createAdminClient } from '@/lib/supabase/admin'
import { addOneMonth, buildBaseSubscriptionRow } from '@/lib/domain/subscriptions'
import { getPackage } from '@/lib/pricing-config'
import { grantPackageIncludedPro, lapsePackageIncludedPro } from '@/lib/actions/pro-membership'
import { PACKAGE_NUMBERS_INCLUDING_PRO } from '@/lib/entitlements'

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
  yocoRef: string,
): Promise<{ renewed: boolean; alreadyApplied: boolean }> {
  const admin = createAdminClient()

  const { data: sub } = await admin
    .from('provider_subscriptions')
    .select('id, billing_end, last_renewal_yoco_ref, status')
    .eq('id', subscriptionId)
    .eq('provider_id', providerId)
    .single()

  if (!sub) return { renewed: false, alreadyApplied: false }

  if (sub.last_renewal_yoco_ref === yocoRef) {
    return { renewed: false, alreadyApplied: true }
  }

  const base = sub.status === 'active' ? new Date(sub.billing_end) : new Date()
  const newEnd = addOneMonth(base)

  const { error: subError } = await admin
    .from('provider_subscriptions')
    .update({
      status: 'active',
      billing_end: newEnd.toISOString(),
      last_renewal_yoco_ref: yocoRef,
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

/**
 * Applies a paid package upgrade (selected at signup or later from billing)
 * to the provider's active subscription — same dedupe-by-yoco_ref pattern as
 * renewProviderSubscription, but also changes package_number/monthly_fee and
 * starts a fresh billing period rather than extending the existing one.
 */
export async function applyProviderSubscriptionUpgrade(
  providerId: string,
  packageNumber: 1 | 2 | 3 | 4 | 5,
  yocoRef: string,
): Promise<{ applied: boolean; alreadyApplied: boolean }> {
  const admin = createAdminClient()

  const { data: sub } = await admin
    .from('provider_subscriptions')
    .select('id, last_renewal_yoco_ref')
    .eq('provider_id', providerId)
    .eq('status', 'active')
    .maybeSingle()

  if (!sub) return { applied: false, alreadyApplied: false }

  if (sub.last_renewal_yoco_ref === yocoRef) {
    return { applied: false, alreadyApplied: true }
  }

  const pkg = getPackage(packageNumber)
  const now = new Date()
  const newEnd = addOneMonth(now)

  const { error } = await admin
    .from('provider_subscriptions')
    .update({
      package_number: pkg.packageNumber,
      monthly_fee: pkg.monthlyFee,
      billing_start: now.toISOString(),
      billing_end: newEnd.toISOString(),
      last_renewal_yoco_ref: yocoRef,
    })
    .eq('id', sub.id)

  if (error) {
    if (error.code === '23505') {
      return { applied: false, alreadyApplied: true }
    }
    console.error('applyProviderSubscriptionUpgrade:', error.message)
    return { applied: false, alreadyApplied: false }
  }

  await admin.from('providers').update({ is_published: true }).eq('id', providerId)

  // Packages 2-5 include Pro automatically; downgrading to base (1) lapses a
  // package_included membership without charging the provider (A.3).
  if (PACKAGE_NUMBERS_INCLUDING_PRO.includes(pkg.packageNumber)) {
    await grantPackageIncludedPro(providerId, pkg.packageNumber)
  } else {
    await lapsePackageIncludedPro(providerId)
  }

  return { applied: true, alreadyApplied: false }
}
