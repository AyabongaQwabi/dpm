'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  claimCodeExpiresAt,
  generateClaimCode,
  hashClaimCode,
  verifyClaimCode,
} from '@/lib/claims/hash'
import { sendClaimVerificationEmail } from '@/lib/email/resend'
import { SITE_URL } from '@/lib/seo'

export type ClaimActionResult = {
  ok: boolean
  error?: string
}

async function getUnclaimedProvider(slug: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('providers')
    .select('id, business_name, slug, claim_status')
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .single()

  if (!data) return null
  if (data.claim_status === 'claimed') return null
  return data
}

export async function initiateClaim(
  slug: string,
  email: string,
): Promise<ClaimActionResult> {
  const trimmedEmail = email.trim().toLowerCase()
  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { ok: false, error: 'Enter a valid business email address.' }
  }

  const provider = await getUnclaimedProvider(slug)
  if (!provider) {
    return { ok: false, error: 'This profile cannot be claimed or was already claimed.' }
  }

  if (provider.claim_status === 'claim_pending') {
    const admin = createAdminClient()
    const { data: pending } = await admin
      .from('profile_claims')
      .select('claimant_email')
      .eq('provider_id', provider.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (pending && pending.claimant_email !== trimmedEmail) {
      return { ok: false, error: 'A claim is already in progress for this profile.' }
    }
  }

  const code = generateClaimCode()
  const admin = createAdminClient()

  await admin
    .from('profile_claims')
    .update({ status: 'expired' })
    .eq('provider_id', provider.id)
    .eq('status', 'pending')

  const { error: insertError } = await admin.from('profile_claims').insert({
    provider_id: provider.id,
    claimant_email: trimmedEmail,
    verification_code: hashClaimCode(code),
    code_expires_at: claimCodeExpiresAt(),
    status: 'pending',
  })

  if (insertError) {
    console.error('profile_claims insert:', insertError.message)
    return { ok: false, error: 'Could not start claim. Please try again.' }
  }

  await admin
    .from('providers')
    .update({ claim_status: 'claim_pending' })
    .eq('id', provider.id)

  const profileSlug = provider.slug ?? slug
  const verifyUrl = `${SITE_URL}/claim/${profileSlug}/verify`

  await sendClaimVerificationEmail({
    to: trimmedEmail,
    code,
    businessName: provider.business_name,
    verifyUrl,
  })

  redirect(`/claim/${profileSlug}/verify?email=${encodeURIComponent(trimmedEmail)}`)
}

export async function verifyClaim(
  slug: string,
  code: string,
  email: string,
): Promise<ClaimActionResult> {
  const trimmedEmail = email.trim().toLowerCase()
  const trimmedCode = code.trim()

  if (!trimmedCode || trimmedCode.length !== 6) {
    return { ok: false, error: 'Enter the 6-digit verification code.' }
  }

  const provider = await getUnclaimedProvider(slug)
  if (!provider) {
    return { ok: false, error: 'This profile cannot be verified.' }
  }

  const admin = createAdminClient()
  const { data: claim } = await admin
    .from('profile_claims')
    .select('id, verification_code, code_expires_at, status')
    .eq('provider_id', provider.id)
    .eq('claimant_email', trimmedEmail)
    .eq('status', 'pending')
    .maybeSingle()

  if (!claim) {
    return { ok: false, error: 'No pending claim found. Start the claim process again.' }
  }

  if (new Date(claim.code_expires_at) < new Date()) {
    await admin.from('profile_claims').update({ status: 'expired' }).eq('id', claim.id)
    return { ok: false, error: 'This code has expired. Please request a new one.' }
  }

  if (!verifyClaimCode(trimmedCode, claim.verification_code)) {
    return { ok: false, error: 'Invalid verification code. Please try again.' }
  }

  let authUserId: string

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: trimmedEmail,
    email_confirm: true,
    user_metadata: { role: 'provider' },
  })

  if (created?.user) {
    authUserId = created.user.id
  } else if (createError?.message?.toLowerCase().includes('already')) {
    const { data: linkLookup } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: trimmedEmail,
    })
    const existingId = linkLookup?.user?.id
    if (!existingId) {
      return { ok: false, error: 'Could not find your account. Contact support.' }
    }
    authUserId = existingId
  } else {
    console.error('createUser:', createError?.message)
    return { ok: false, error: 'Could not create your account. Contact support.' }
  }

  const { data: otherProvider } = await admin
    .from('providers')
    .select('id')
    .eq('auth_provider_id', authUserId)
    .neq('id', provider.id)
    .maybeSingle()

  if (otherProvider) {
    return {
      ok: false,
      error: 'This email is already linked to another provider account.',
    }
  }

  await admin
    .from('profile_claims')
    .update({
      status: 'verified',
      claimed_auth_id: authUserId,
      verified_at: new Date().toISOString(),
    })
    .eq('id', claim.id)

  await admin
    .from('providers')
    .update({
      claim_status: 'claimed',
      auth_provider_id: authUserId,
      onboarding_step: 1,
      is_published: false,
    })
    .eq('id', provider.id)

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: trimmedEmail,
    options: {
      redirectTo: `${SITE_URL}/provider-dashboard/onboarding?claimed=1`,
    },
  })

  if (linkError || !linkData?.properties?.action_link) {
    console.error('generateLink:', linkError?.message)
    return {
      ok: false,
      error: 'Claim verified but sign-in link failed. Use provider login with your email.',
    }
  }

  redirect(linkData.properties.action_link)
}
