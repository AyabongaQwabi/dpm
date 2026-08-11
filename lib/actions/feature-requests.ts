'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  hashIpAddress,
  initialFeatureRequestState,
  type FeatureRequestActionState,
  type FeatureRequestInsert,
  type StoredFeatureRequest,
} from '@/lib/domain/feature-requests'
import { FEATURE_REQUEST_NOTIFICATION, submitFeatureRequestWithDeps } from '@/lib/feature-requests-submit'
import {
  sendFeatureRequestConfirmationEmail,
  sendFeatureRequestNotificationEmail,
} from '@/lib/email/resend'

function firstForwardedIp(value: string | null): string | null {
  if (!value) return null
  return value.split(',')[0]?.trim() || null
}

function clientIpFromHeaders(hdrs: Headers): string | null {
  return (
    firstForwardedIp(hdrs.get('x-forwarded-for')) ??
    hdrs.get('x-real-ip') ??
    hdrs.get('cf-connecting-ip') ??
    null
  )
}

export async function submitFeatureRequest(
  prevState: FeatureRequestActionState = initialFeatureRequestState,
  formData: FormData,
): Promise<FeatureRequestActionState> {
  const salt = process.env.FEATURE_REQUEST_IP_HASH_SALT
  if (!salt) {
    return {
      ok: false,
      message: 'Feature requests are not configured yet. Please try again later.',
      errors: {},
    }
  }

  const [supabase, hdrs] = await Promise.all([createClient(), headers()])
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  const ipHash = hashIpAddress(clientIpFromHeaders(hdrs), salt)

  return submitFeatureRequestWithDeps(prevState, formData, {
    userId: user?.id ?? null,
    userAgent: hdrs.get('user-agent'),
    ipHash,
  }, {
    countRecentSubmissions: async ({ ipHash: recentIpHash, sinceIso }) => {
      const { count, error } = await admin
        .from('feature_requests')
        .select('id', { count: 'exact', head: true })
        .eq('ip_hash', recentIpHash)
        .gte('created_at', sinceIso)

      if (error) {
        console.error('feature_requests rate limit check failed:', error.message)
        return 0
      }
      return count ?? 0
    },
    insertFeatureRequest: async (row: FeatureRequestInsert) => {
      const { data, error } = await admin
        .from('feature_requests')
        .insert(row)
        .select('*')
        .single<StoredFeatureRequest>()

      if (error || !data) {
        console.error('feature_requests insert failed:', error?.message ?? 'No row returned')
        throw new Error('Feature request insert failed')
      }
      return data
    },
    sendNotificationEmail: async ({ request, html }) => {
      const result = await sendFeatureRequestNotificationEmail({
        to: FEATURE_REQUEST_NOTIFICATION.recipient,
        replyTo: request.email,
        title: request.title,
        html,
      })
      if (!result.ok) throw new Error(result.error ?? 'Feature request notification email failed')
    },
    sendConfirmationEmail: async ({ request, html }) => {
      const result = await sendFeatureRequestConfirmationEmail({
        to: request.email,
        title: request.title,
        html,
      })
      if (!result.ok) throw new Error(result.error ?? 'Feature request confirmation email failed')
    },
    logEmailError: (error) => {
      console.error('feature request email failed:', error instanceof Error ? error.message : String(error))
    },
  })
}
