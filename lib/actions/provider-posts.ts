'use server'

// Server actions for provider posts & stories. Free for every provider —
// pro.publishing_limits only raises the caps, it never gates who can
// publish. Every limit is read from config (lib/provider-posts-config.ts).

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireProviderSession } from '@/lib/session'
import { hasEntitlement } from '@/lib/actions/pro-membership'
import { ENTITLEMENT_KEYS } from '@/lib/entitlements'
import { getPublishingLimits, STORY_LIFETIME_MS } from '@/lib/provider-posts-config'
import {
  canPublishMorePosts,
  canPublishMoreStories,
  isWithinImageLimit,
  isWithinBodyLimit,
  isWithinStoryBodyLimit,
  storyBodyLimitForMedia,
  computeExpiresAt,
} from '@/lib/domain/provider-posts'
import { moderateContent, blockMessage } from '@/lib/domain/content-moderation'
import { MODERATION_WORD_LISTS } from '@/lib/content-moderation-config'
import { tiptapToPlainText } from '@/lib/tiptap-to-html'
import { slugifyName } from '@/lib/domain/slug'

async function getPublishingLimitsForProvider(providerId: string) {
  const isPro = await hasEntitlement(providerId, ENTITLEMENT_KEYS.PUBLISHING_LIMITS)
  return getPublishingLimits(isPro)
}

async function countPostsThisMonth(providerId: string): Promise<number> {
  const admin = createAdminClient()
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { count } = await admin
    .from('content_posts')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', providerId)
    .eq('kind', 'post')
    .neq('status', 'draft')
    .gte('published_at', monthStart.toISOString())

  return count ?? 0
}

async function countLiveStories(providerId: string): Promise<number> {
  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { count } = await admin
    .from('content_posts')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', providerId)
    .eq('kind', 'story')
    .eq('status', 'published')
    .gt('expires_at', now)

  return count ?? 0
}

async function generateUniquePostSlug(providerId: string, title: string): Promise<string> {
  const admin = createAdminClient()
  const base = slugifyName(title) || 'post'

  const { data: existing } = await admin
    .from('content_posts')
    .select('slug')
    .eq('provider_id', providerId)
    .not('slug', 'is', null)

  const taken = new Set((existing ?? []).map((r) => r.slug as string))
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

async function getProviderProfilePath(providerId: string, admin = createAdminClient()): Promise<string> {
  const { data } = await admin
    .from('providers')
    .select('slug')
    .eq('id', providerId)
    .maybeSingle()

  return data?.slug ?? providerId
}

interface PublishInput {
  kind: 'post' | 'story'
  title: string | null
  bodyJson: unknown
  media: string[]
}

type PublishResult =
  | { ok: true; postId: string }
  | { ok: false; error: string; blockReasons?: string[] }

async function publishContentPost(input: PublishInput): Promise<PublishResult> {
  const { provider } = await requireProviderSession()
  const admin = createAdminClient()

  const limits = await getPublishingLimitsForProvider(provider.id)
  const bodyText = tiptapToPlainText(input.bodyJson)

  if (!bodyText && input.media.length === 0) {
    return { ok: false, error: 'Write something or add an image before publishing.' }
  }

  const maxImages = input.kind === 'story' ? 1 : limits.imagesPerPost
  if (input.media.length > maxImages || (input.kind === 'post' && !isWithinImageLimit(input.media.length, limits))) {
    return { ok: false, error: `Too many images — the limit is ${maxImages} per ${input.kind}.` }
  }
  if (input.kind === 'story') {
    const storyLimit = storyBodyLimitForMedia(input.media.length, limits)
    if (!isWithinStoryBodyLimit(bodyText.length, input.media.length, limits)) {
      return { ok: false, error: `Too long — the story limit is ${storyLimit} characters${input.media.length > 0 ? ' when an image is attached' : ''}.` }
    }
  } else if (!isWithinBodyLimit(bodyText.length, limits)) {
    return { ok: false, error: `Too long — the limit is ${limits.bodyMaxChars} characters.` }
  }

  if (input.kind === 'post') {
    if (!input.title?.trim()) {
      return { ok: false, error: 'Posts need a title.' }
    }
    const postsThisMonth = await countPostsThisMonth(provider.id)
    if (!canPublishMorePosts(postsThisMonth, limits)) {
      return { ok: false, error: `You've reached your limit of ${limits.postsPerMonth} posts this month.` }
    }
  } else {
    const storiesLive = await countLiveStories(provider.id)
    if (!canPublishMoreStories(storiesLive, limits)) {
      return { ok: false, error: `You already have ${limits.storiesLiveAtOnce} ${limits.storiesLiveAtOnce === 1 ? 'story' : 'stories'} live — wait for one to expire or remove one first.` }
    }
  }

  // Moderation — contact details BLOCK (checked on title + body), claims/
  // competitors/profanity FLAG (publishes, marked for review).
  const moderation = moderateContent({ title: input.title, bodyText }, MODERATION_WORD_LISTS)
  if (moderation.blocked) {
    return { ok: false, error: blockMessage(moderation.blockReasons), blockReasons: moderation.blockReasons }
  }

  const now = new Date()
  const publishedAt = now
  const expiresAt = computeExpiresAt(input.kind, publishedAt, STORY_LIFETIME_MS)
  const slug = input.kind === 'post' ? await generateUniquePostSlug(provider.id, input.title!) : null

  const { data: inserted, error } = await admin
    .from('content_posts')
    .insert({
      provider_id: provider.id,
      kind: input.kind,
      title: input.kind === 'post' ? input.title!.trim() : null,
      slug,
      body: bodyText,
      body_json: input.bodyJson,
      media: input.media,
      image_url: input.media[0] ?? null, // legacy column, kept for /feed compat
      post_type: input.kind === 'story' ? 'story' : 'social',
      status: 'published',
      published_at: publishedAt.toISOString(),
      expires_at: expiresAt ? expiresAt.toISOString() : null,
      moderation_status: moderation.flagged ? 'flagged' : 'passed',
      moderation_notes: moderation.flagged ? moderation.flagReasons.join('; ') : null,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    console.error('publishContentPost:', error?.message)
    return { ok: false, error: 'Something went wrong publishing — try again.' }
  }

  const profilePath = await getProviderProfilePath(provider.id, admin)
  revalidatePath('/provider-dashboard/posts')
  revalidatePath(`/providers/${profilePath}`)
  revalidatePath('/feed')
  if (slug) revalidatePath(`/providers/${profilePath}/posts/${slug}`)

  return { ok: true, postId: inserted.id }
}

export async function publishPost(formData: FormData): Promise<void> {
  const title = (formData.get('title') as string ?? '').trim()
  const bodyJsonRaw = formData.get('bodyJson') as string
  const mediaRaw = formData.get('media') as string ?? '[]'
  let bodyJson: unknown = null
  let media: string[] = []
  try {
    bodyJson = bodyJsonRaw ? JSON.parse(bodyJsonRaw) : null
    media = JSON.parse(mediaRaw)
  } catch {
    redirect('/provider-dashboard/posts?error=invalid')
  }

  const result = await publishContentPost({ kind: 'post', title, bodyJson, media })
  if (!result.ok) {
    redirect(`/provider-dashboard/posts?error=${encodeURIComponent(result.error)}`)
  }
  redirect('/provider-dashboard/posts?published=1')
}

export async function publishStory(formData: FormData): Promise<void> {
  const bodyJsonRaw = formData.get('bodyJson') as string
  const mediaRaw = formData.get('media') as string ?? '[]'
  let bodyJson: unknown = null
  let media: string[] = []
  try {
    bodyJson = bodyJsonRaw ? JSON.parse(bodyJsonRaw) : null
    media = JSON.parse(mediaRaw)
  } catch {
    redirect('/provider-dashboard/posts?error=invalid')
  }

  const result = await publishContentPost({ kind: 'story', title: null, bodyJson, media })
  if (!result.ok) {
    redirect(`/provider-dashboard/posts?error=${encodeURIComponent(result.error)}`)
  }
  redirect('/provider-dashboard/posts?published=1')
}

// ---- Draft autosave (posts only — stories publish immediately or not at all) ----

export async function saveDraft(formData: FormData): Promise<{ ok: boolean; draftId?: string }> {
  const { provider } = await requireProviderSession()
  const admin = createAdminClient()

  const draftId = (formData.get('draftId') as string) || null
  const title = (formData.get('title') as string ?? '').trim()
  const bodyJsonRaw = formData.get('bodyJson') as string
  const mediaRaw = formData.get('media') as string ?? '[]'

  let bodyJson: unknown = null
  let media: string[] = []
  try {
    bodyJson = bodyJsonRaw ? JSON.parse(bodyJsonRaw) : null
    media = JSON.parse(mediaRaw)
  } catch {
    return { ok: false }
  }

  const bodyText = tiptapToPlainText(bodyJson)
  const row = {
    provider_id: provider.id,
    kind: 'post' as const,
    title: title || null,
    body: bodyText,
    body_json: bodyJson,
    media,
    post_type: 'social',
    status: 'draft' as const,
  }

  if (draftId) {
    const { data: existing } = await admin
      .from('content_posts')
      .select('id')
      .eq('id', draftId)
      .eq('provider_id', provider.id)
      .eq('status', 'draft')
      .maybeSingle()
    if (!existing) return { ok: false }

    await admin.from('content_posts').update(row).eq('id', draftId)
    return { ok: true, draftId }
  }

  const { data: inserted, error } = await admin.from('content_posts').insert(row).select('id').single()
  if (error || !inserted) return { ok: false }
  return { ok: true, draftId: inserted.id }
}

// ---- Publish a saved draft ----

export async function publishDraft(formData: FormData): Promise<void> {
  const { provider } = await requireProviderSession()
  const admin = createAdminClient()
  const draftId = formData.get('draftId') as string

  const { data: draft } = await admin
    .from('content_posts')
    .select('id, title, body_json, media')
    .eq('id', draftId)
    .eq('provider_id', provider.id)
    .eq('status', 'draft')
    .single()

  if (!draft) redirect('/provider-dashboard/posts?error=Draft%20not%20found')

  const result = await publishContentPost({
    kind: 'post',
    title: draft.title,
    bodyJson: draft.body_json,
    media: Array.isArray(draft.media) ? (draft.media as string[]) : [],
  })

  if (result.ok) {
    // Publishing creates a fresh row via publishContentPost — remove the draft.
    await admin.from('content_posts').delete().eq('id', draftId)
    redirect('/provider-dashboard/posts?published=1')
  }
  redirect(`/provider-dashboard/posts?error=${encodeURIComponent(result.error)}`)
}

// ---- Unpublish / delete ----

export async function unpublishPost(formData: FormData): Promise<void> {
  const { provider } = await requireProviderSession()
  const admin = createAdminClient()
  const postId = formData.get('postId') as string

  await admin
    .from('content_posts')
    .update({ status: 'removed' })
    .eq('id', postId)
    .eq('provider_id', provider.id)

  revalidatePath('/provider-dashboard/posts')
  revalidatePath(`/providers/${await getProviderProfilePath(provider.id, admin)}`)
}

export async function deletePost(formData: FormData): Promise<void> {
  const { provider } = await requireProviderSession()
  const admin = createAdminClient()
  const postId = formData.get('postId') as string

  await admin
    .from('content_posts')
    .delete()
    .eq('id', postId)
    .eq('provider_id', provider.id)

  revalidatePath('/provider-dashboard/posts')
  revalidatePath(`/providers/${await getProviderProfilePath(provider.id, admin)}`)
}

// ---- Report (public, no auth required) ----

export async function reportPost(formData: FormData): Promise<{ ok: boolean }> {
  const postId = formData.get('postId') as string
  const reason = (formData.get('reason') as string ?? '').trim().slice(0, 500)
  if (!postId || !reason) return { ok: false }

  const admin = createAdminClient()
  const { error } = await admin.from('content_post_reports').insert({ post_id: postId, reason })
  if (error) {
    console.error('reportPost:', error.message)
    return { ok: false }
  }
  return { ok: true }
}
