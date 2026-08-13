'use server'

/**
 * Provider-side review actions: reply once, and flag for admin attention.
 *
 * A provider may NOT delete, hide, or edit the rating or body of a review.
 * Flagging opens an admin review; it does not hide anything — the review stays
 * `published` and keeps counting toward aggregates until an admin decides
 * otherwise. Moderation itself uses the existing admin (service-role) pattern.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireProviderSession } from '@/lib/session'
import { canEditProviderReply } from '@/lib/domain/reviews'
import { PROVIDER_REPLY_EDITABLE_FOR_HOURS } from '@/lib/booking-lifecycle-config'

export async function replyToReview(formData: FormData): Promise<void> {
  const { provider } = await requireProviderSession()
  const reviewId = formData.get('reviewId') as string
  const reply = ((formData.get('reply') as string) || '').trim().slice(0, 2000)

  if (!reviewId || !reply) return

  const supabase = await createClient()
  const { data: review } = await supabase
    .from('reviews')
    .select('id, provider_id, provider_replied_at')
    .eq('id', reviewId)
    .eq('provider_id', provider.id)
    .maybeSingle()

  if (!review) return

  // One reply, editable only inside the window.
  // TODO(aya): confirm — suggested 24 hours.
  if (
    !canEditProviderReply({
      repliedAt: review.provider_replied_at,
      editableForHours: PROVIDER_REPLY_EDITABLE_FOR_HOURS,
    })
  ) {
    return
  }

  const admin = createAdminClient()
  await admin
    .from('reviews')
    .update({
      provider_reply: reply,
      // First reply stamps the clock; an edit inside the window keeps it, so
      // the window measures from the original reply.
      provider_replied_at: review.provider_replied_at ?? new Date().toISOString(),
    })
    .eq('id', reviewId)

  revalidatePath('/provider-dashboard')
}

/**
 * Flag a review for admin attention.
 *
 * NOTE ON SEMANTICS: setting status='flagged' does remove the review from the
 * cached aggregates (the trigger only counts 'published'), which is a partial
 * suppression a provider can trigger unilaterally. To keep "providers cannot
 * hide-by-flagging" true, the flag is recorded on a separate column and the
 * review stays `published` — visible and still counted — until an admin acts.
 */
export async function flagReview(formData: FormData): Promise<void> {
  const { provider } = await requireProviderSession()
  const reviewId = formData.get('reviewId') as string
  if (!reviewId) return

  const reason = ((formData.get('reason') as string) || '').trim().slice(0, 500)

  const supabase = await createClient()
  const { data: review } = await supabase
    .from('reviews')
    .select('id, provider_id, flagged_at')
    .eq('id', reviewId)
    .eq('provider_id', provider.id)
    .maybeSingle()

  if (!review || review.flagged_at) return

  const admin = createAdminClient()
  await admin
    .from('reviews')
    .update({
      flagged_at: new Date().toISOString(),
      flag_reason: reason || 'Flagged by provider',
    })
    .eq('id', reviewId)

  revalidatePath('/provider-dashboard')
}
