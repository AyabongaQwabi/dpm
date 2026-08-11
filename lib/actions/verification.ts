'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  claimCodeExpiresAt,
  generateClaimCode,
  hashClaimCode,
  verifyClaimCode,
} from '@/lib/claims/hash'
import { sendContactVerificationEmail } from '@/lib/email/resend'

export type VerificationActionResult = {
  ok: boolean
  error?: string
}

async function requireProviderId(): Promise<{ providerId: string; authUserId: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: provider } = await supabase
    .from('providers')
    .select('id')
    .eq('auth_provider_id', user.id)
    .single()

  if (!provider) return null
  return { providerId: provider.id, authUserId: user.id }
}

/**
 * Sends a 6-digit code to the provider's own account email (the same email
 * they log in with — already trusted by Supabase Auth, not user-supplied
 * here) to confirm it's a live inbox. Phone/SMS verification is out of scope
 * until an SMS provider is configured — see migration comment.
 */
export async function requestContactVerification(): Promise<VerificationActionResult> {
  const session = await requireProviderId()
  if (!session) return { ok: false, error: 'Not signed in.' }

  const admin = createAdminClient()

  const { data: provider } = await admin
    .from('providers')
    .select('id, business_name')
    .eq('id', session.providerId)
    .single()

  if (!provider) return { ok: false, error: 'Provider not found.' }

  const { data: userData } = await admin.auth.admin.getUserById(session.authUserId)
  const email = userData?.user?.email
  if (!email) return { ok: false, error: 'No account email found.' }

  // Supersede any prior pending code — mirrors initiateClaim's pattern.
  await admin
    .from('contact_verifications')
    .update({ status: 'expired' })
    .eq('provider_id', session.providerId)
    .eq('status', 'pending')

  const code = generateClaimCode()
  const { error: insertError } = await admin.from('contact_verifications').insert({
    provider_id: session.providerId,
    email,
    verification_code: hashClaimCode(code),
    code_expires_at: claimCodeExpiresAt(),
    status: 'pending',
  })

  if (insertError) {
    console.error('contact_verifications insert:', insertError.message)
    return { ok: false, error: 'Could not start verification. Please try again.' }
  }

  const emailResult = await sendContactVerificationEmail({
    to: email,
    code,
    businessName: provider.business_name,
  })

  if (!emailResult.ok) {
    return { ok: false, error: 'Could not send verification email. Please try again.' }
  }

  return { ok: true }
}

export async function verifyContactCode(code: string): Promise<VerificationActionResult> {
  const session = await requireProviderId()
  if (!session) return { ok: false, error: 'Not signed in.' }

  const trimmedCode = code.trim()
  if (!trimmedCode || trimmedCode.length !== 6) {
    return { ok: false, error: 'Enter the 6-digit verification code.' }
  }

  const admin = createAdminClient()

  const { data: pending } = await admin
    .from('contact_verifications')
    .select('id, verification_code, code_expires_at')
    .eq('provider_id', session.providerId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .maybeSingle()

  if (!pending) {
    return { ok: false, error: 'No pending verification found. Request a new code.' }
  }

  if (new Date(pending.code_expires_at) < new Date()) {
    await admin.from('contact_verifications').update({ status: 'expired' }).eq('id', pending.id)
    return { ok: false, error: 'This code has expired. Please request a new one.' }
  }

  if (!verifyClaimCode(trimmedCode, pending.verification_code)) {
    return { ok: false, error: 'Invalid verification code. Please try again.' }
  }

  await admin
    .from('contact_verifications')
    .update({ status: 'verified', verified_at: new Date().toISOString() })
    .eq('id', pending.id)

  const { error: updateError } = await admin
    .from('providers')
    .update({ verified_contact: true })
    .eq('id', session.providerId)

  if (updateError) {
    console.error('providers.verified_contact update:', updateError.message)
    return { ok: false, error: 'Verified, but could not update your profile. Contact support.' }
  }

  return { ok: true }
}
