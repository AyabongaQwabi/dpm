'use server'

// Server actions for pro.profile_customisation and pro.custom_slug (Batch B).
// Every write here re-checks hasEntitlement() server-side — the dashboard UI
// hides these controls for non-Pro providers, but that's a convenience, not
// the gate. Publishing (posts/stories) moved to lib/actions/provider-posts.ts —
// it's free for every provider, not a Pro-gated feature; see the posts/stories
// build spec for why pro.publishing was retired in favour of
// pro.publishing_limits.

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireProviderSession } from '@/lib/session'
import { hasEntitlement } from '@/lib/actions/pro-membership'
import { ENTITLEMENT_KEYS } from '@/lib/entitlements'
import { isReservedSlug, isValidCustomSlugFormat } from '@/lib/domain/slug'

const ACCENT_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

// ---- pro.profile_customisation ----

export async function updateProfileCustomisation(formData: FormData) {
  const { provider } = await requireProviderSession()

  const allowed = await hasEntitlement(provider.id, ENTITLEMENT_KEYS.PROFILE_CUSTOMISATION)
  if (!allowed) redirect('/provider-dashboard/pro')

  const admin = createAdminClient()

  const accentColorRaw = (formData.get('accentColor') as string ?? '').trim()
  const accentColor = accentColorRaw && ACCENT_COLOR_PATTERN.test(accentColorRaw) ? accentColorRaw : null

  const pinnedServiceId = (formData.get('pinnedServiceId') as string ?? '').trim() || null
  if (pinnedServiceId) {
    const { data: service } = await admin
      .from('services')
      .select('id')
      .eq('id', pinnedServiceId)
      .eq('provider_id', provider.id)
      .maybeSingle()
    if (!service) {
      revalidatePath('/provider-dashboard/pro')
      return
    }
  }

  const ctaLabel = (formData.get('ctaLabel') as string ?? '').trim().slice(0, 40) || null
  const ctaTargetUrlRaw = (formData.get('ctaTargetUrl') as string ?? '').trim()
  let ctaTargetUrl: string | null = null
  if (ctaTargetUrlRaw) {
    try {
      const url = new URL(ctaTargetUrlRaw)
      if (url.protocol === 'https:' || url.protocol === 'http:') ctaTargetUrl = url.toString()
    } catch {
      // invalid URL — drop it rather than save garbage
    }
  }

  await admin
    .from('providers')
    .update({
      accent_color: accentColor,
      pinned_service_id: pinnedServiceId,
      cta_label: ctaLabel,
      cta_target_url: ctaTargetUrl,
    })
    .eq('id', provider.id)

  revalidatePath('/provider-dashboard/pro')
  revalidatePath(`/providers/${provider.id}`)
}

// ---- pro.custom_slug ----

export async function updateCustomSlug(formData: FormData) {
  const { provider } = await requireProviderSession()

  const allowed = await hasEntitlement(provider.id, ENTITLEMENT_KEYS.CUSTOM_SLUG)
  if (!allowed) redirect('/provider-dashboard/pro')

  const requested = (formData.get('slug') as string ?? '').trim().toLowerCase()
  if (!requested || !isValidCustomSlugFormat(requested)) {
    redirect('/provider-dashboard/pro?slugError=format')
  }
  if (isReservedSlug(requested)) {
    redirect('/provider-dashboard/pro?slugError=reserved')
  }

  const admin = createAdminClient()

  const { data: currentRow } = await admin
    .from('providers')
    .select('slug')
    .eq('id', provider.id)
    .single()

  const currentSlug = currentRow?.slug ?? null
  if (currentSlug === requested) {
    revalidatePath('/provider-dashboard/pro')
    return
  }

  // Uniqueness: not any provider's current slug, and not any provider's
  // retired slug (provider_slug_history.slug is unique across all providers).
  const { data: slugTaken } = await admin
    .from('providers')
    .select('id')
    .eq('slug', requested)
    .maybeSingle()
  const { data: historyTaken } = await admin
    .from('provider_slug_history')
    .select('id')
    .eq('slug', requested)
    .maybeSingle()

  if (slugTaken || historyTaken) {
    redirect('/provider-dashboard/pro?slugError=taken')
  }

  // Record the outgoing slug so old links keep resolving (301 in the
  // profile route), then swap to the new one.
  if (currentSlug) {
    await admin.from('provider_slug_history').insert({ provider_id: provider.id, slug: currentSlug })
  }

  const { error } = await admin.from('providers').update({ slug: requested }).eq('id', provider.id)
  if (error) {
    console.error('updateCustomSlug:', error.message)
    redirect('/provider-dashboard/pro?slugError=save_failed')
  }

  revalidatePath('/provider-dashboard/pro')
  if (currentSlug) revalidatePath(`/providers/${currentSlug}`)
  revalidatePath(`/providers/${requested}`)
}
