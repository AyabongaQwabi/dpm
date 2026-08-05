'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/lib/session'
import { createAdminClient } from '@/lib/supabase/admin'

export type AdminClaimActionResult = {
  ok: boolean
  error?: string
}

/**
 * Rejects a pending claim: marks the claim row rejected and reopens the
 * profile for future claim attempts (back to unclaimed).
 */
export async function rejectClaim(claimId: string): Promise<AdminClaimActionResult> {
  await requireAdminSession()
  const admin = createAdminClient()

  const { data: claim } = await admin
    .from('profile_claims')
    .select('id, provider_id, status')
    .eq('id', claimId)
    .maybeSingle()

  if (!claim || claim.status !== 'pending') {
    return { ok: false, error: 'This claim is no longer pending.' }
  }

  const { error: claimError } = await admin
    .from('profile_claims')
    .update({ status: 'rejected' })
    .eq('id', claimId)

  if (claimError) {
    return { ok: false, error: 'Could not reject claim. Try again.' }
  }

  await admin
    .from('providers')
    .update({ claim_status: 'unclaimed' })
    .eq('id', claim.provider_id)
    .eq('claim_status', 'claim_pending')

  revalidatePath('/admin/claims')
  return { ok: true }
}

/**
 * Reverts a claimed profile back to unclaimed — for disputes or mistaken
 * claims. Does not touch the auth user, only the provider row's claim state
 * and publish flag, and expires any lingering claim rows.
 */
export async function forceUnclaim(providerId: string): Promise<AdminClaimActionResult> {
  await requireAdminSession()
  const admin = createAdminClient()

  const { error } = await admin
    .from('providers')
    .update({ claim_status: 'unclaimed', is_published: false })
    .eq('id', providerId)

  if (error) {
    return { ok: false, error: 'Could not update this profile. Try again.' }
  }

  await admin
    .from('profile_claims')
    .update({ status: 'expired' })
    .eq('provider_id', providerId)
    .eq('status', 'pending')

  revalidatePath('/admin/claims')
  return { ok: true }
}
