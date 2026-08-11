import { createAdminClient } from '@/lib/supabase/admin'
import { membershipGrants, addOneMonth, addOneYear, type ProMembershipRow } from '@/lib/domain/pro-membership'
import { PACKAGE_NUMBERS_INCLUDING_PRO, PRO_MEMBERSHIP_CONFIG, type EntitlementKey } from '@/lib/entitlements'

/**
 * The only way any code should check Pro status. No component or route
 * handler should query pro_memberships directly.
 */
export async function hasEntitlement(providerId: string, key: EntitlementKey): Promise<boolean> {
  const admin = createAdminClient()

  const { data: membership } = await admin
    .from('pro_memberships')
    .select('status, source, current_period_end')
    .eq('provider_id', providerId)
    .in('status', ['active', 'lapsed'])
    .maybeSingle<ProMembershipRow>()

  return membershipGrants(membership, key)
}

/**
 * Returns the provider's current Pro membership row, or null if they've
 * never held one. Used by dashboard billing UI — not for entitlement checks
 * (use hasEntitlement for that).
 */
export async function getProMembership(providerId: string) {
  const admin = createAdminClient()

  const { data } = await admin
    .from('pro_memberships')
    .select('*')
    .eq('provider_id', providerId)
    .in('status', ['active', 'lapsed'])
    .maybeSingle()

  return data
}

/**
 * Purchases a standalone Pro membership against the provider credit wallet.
 * Server-side only. Caller must have already confirmed the provider holds
 * Contact verification — this function re-checks it and throws if not, so
 * this gate can never be bypassed even if a caller forgets the UI check.
 *
 * Does not touch Yoco. If the wallet is short, the caller should route the
 * provider to the existing top-up flow — this function only spends what's
 * already in the wallet.
 */
export async function purchaseProMembership(
  providerId: string,
  billingPeriod: 'monthly' | 'annual',
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient()

  const { data: provider } = await admin
    .from('providers')
    .select('id, verified_contact')
    .eq('id', providerId)
    .single()

  if (!provider) return { ok: false, error: 'Provider not found' }
  if (!provider.verified_contact) {
    return { ok: false, error: 'Contact verification is required before purchasing Pro membership' }
  }

  const { data: existing } = await admin
    .from('pro_memberships')
    .select('id, status, source')
    .eq('provider_id', providerId)
    .in('status', ['active', 'lapsed'])
    .maybeSingle()

  if (existing?.status === 'active') {
    return { ok: false, error: 'Provider already has an active Pro membership' }
  }

  const amount = billingPeriod === 'annual' ? PRO_MEMBERSHIP_CONFIG.annualFee : PRO_MEMBERSHIP_CONFIG.monthlyFee
  const now = new Date()
  const periodEnd = billingPeriod === 'annual' ? addOneYear(now) : addOneMonth(now)

  const { error: spendError } = await admin.rpc('provider_wallet_spend', {
    p_provider_id: providerId,
    p_amount: amount,
    p_description: `Pro membership (${billingPeriod})`,
  })

  if (spendError) {
    if (spendError.message.includes('Insufficient credit balance')) {
      return { ok: false, error: 'insufficient_balance' }
    }
    console.error('purchaseProMembership spend:', spendError.message)
    return { ok: false, error: 'Purchase failed' }
  }

  const row = {
    provider_id: providerId,
    status: 'active' as const,
    source: 'purchased' as const,
    started_at: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
  }

  const { error: upsertError } = existing
    ? await admin.from('pro_memberships').update(row).eq('id', existing.id)
    : await admin.from('pro_memberships').insert(row)

  if (upsertError) {
    console.error('purchaseProMembership upsert:', upsertError.message)
    return { ok: false, error: 'Purchase recorded payment but failed to activate membership — contact support' }
  }

  return { ok: true }
}

/**
 * Grants (or refreshes) a package_included Pro membership for a provider on
 * packages 2-5. Called from the same place package upgrades are applied
 * (lib/actions/subscriptions.ts) — never charges the wallet, since the
 * package fee already covers it.
 */
export async function grantPackageIncludedPro(providerId: string, packageNumber: number): Promise<void> {
  const admin = createAdminClient()

  if (!PACKAGE_NUMBERS_INCLUDING_PRO.includes(packageNumber)) return

  const { data: existing } = await admin
    .from('pro_memberships')
    .select('id, source')
    .eq('provider_id', providerId)
    .in('status', ['active', 'lapsed'])
    .maybeSingle()

  const row = {
    provider_id: providerId,
    status: 'active' as const,
    source: 'package_included' as const,
    started_at: new Date().toISOString(),
    current_period_end: null, // package-included Pro follows the subscription's own billing cycle, not its own
  }

  if (existing) {
    await admin.from('pro_memberships').update(row).eq('id', existing.id)
  } else {
    await admin.from('pro_memberships').insert(row)
  }
}

/**
 * Converts a package_included Pro membership to lapsed when a provider
 * downgrades to the base package. Does NOT touch purchased memberships —
 * those lapse independently on their own period_end (see lapseExpiredMemberships).
 * Never silently charges the provider; the dashboard should surface the
 * choice to buy Pro standalone instead.
 */
export async function lapsePackageIncludedPro(providerId: string): Promise<void> {
  const admin = createAdminClient()

  await admin
    .from('pro_memberships')
    .update({ status: 'lapsed' })
    .eq('provider_id', providerId)
    .eq('source', 'package_included')
    .eq('status', 'active')
}

/**
 * Lapses purchased/granted memberships whose current_period_end has passed
 * without renewal. Intended to run on a schedule (cron route) alongside
 * subscription expiry checks. Every entitlement drops the moment status
 * flips — hasEntitlement() re-checks status on every call, so there is no
 * caching to invalidate.
 */
export async function lapseExpiredMemberships(): Promise<number> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('pro_memberships')
    .update({ status: 'lapsed' })
    .eq('status', 'active')
    .in('source', ['purchased', 'granted'])
    .lt('current_period_end', new Date().toISOString())
    .select('id')

  if (error) {
    console.error('lapseExpiredMemberships:', error.message)
    return 0
  }

  return data?.length ?? 0
}
