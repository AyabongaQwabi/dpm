// Pure provider-posts/stories logic — no DB/framework imports.

export type ContentPostKind = 'post' | 'story'
export type ContentPostStatus = 'draft' | 'published' | 'expired' | 'removed'
export type ContentPostModerationStatus = 'passed' | 'flagged' | 'removed'

export interface PublishingLimits {
  postsPerMonth: number
  storiesLiveAtOnce: number
  imagesPerPost: number
  bodyMaxChars: number
  storyTextMaxChars: number
  storyCaptionMaxChars: number
}

export function canPublishMorePosts(postsThisMonth: number, limits: PublishingLimits): boolean {
  return postsThisMonth < limits.postsPerMonth
}

export function canPublishMoreStories(storiesLive: number, limits: PublishingLimits): boolean {
  return storiesLive < limits.storiesLiveAtOnce
}

export function isWithinImageLimit(imageCount: number, limits: PublishingLimits): boolean {
  return imageCount <= limits.imagesPerPost
}

export function isWithinBodyLimit(bodyLength: number, limits: PublishingLimits): boolean {
  return bodyLength <= limits.bodyMaxChars
}

export function storyBodyLimitForMedia(imageCount: number, limits: PublishingLimits): number {
  return imageCount > 0 ? limits.storyCaptionMaxChars : limits.storyTextMaxChars
}

export function isWithinStoryBodyLimit(bodyLength: number, imageCount: number, limits: PublishingLimits): boolean {
  return bodyLength <= storyBodyLimitForMedia(imageCount, limits)
}

const DEFAULT_STORY_LIFETIME_MS = 24 * 60 * 60 * 1000

/**
 * Stories expire `lifetimeMs` after publish (default 24h — see
 * config/publishing-limits.json's storyLifetimeHours for the configured
 * value; the caller in lib/actions/provider-posts.ts passes it explicitly
 * so this pure function stays config-agnostic). Posts never get an expiry.
 */
export function computeExpiresAt(kind: ContentPostKind, publishedAt: Date, lifetimeMs: number = DEFAULT_STORY_LIFETIME_MS): Date | null {
  if (kind !== 'story') return null
  return new Date(publishedAt.getTime() + lifetimeMs)
}

export function isExpired(expiresAt: string | Date | null, now: Date = new Date()): boolean {
  if (!expiresAt) return false
  const end = expiresAt instanceof Date ? expiresAt : new Date(expiresAt)
  return end.getTime() <= now.getTime()
}

/**
 * Whether a post row should be publicly visible — the same rule the RLS
 * policy enforces server-side, expressed here so UI code can check it
 * without a round trip. draft/expired/removed all return false.
 */
export function isPubliclyVisible(status: ContentPostStatus, moderationStatus: ContentPostModerationStatus): boolean {
  return status === 'published' && moderationStatus === 'passed'
}

/**
 * Upsell copy shown when a free-tier provider hits a cap — factual, no
 * pressure language, no claim that posting brings more work (per spec).
 */
export function upsellMessage(limitKind: 'postsPerMonth' | 'storiesLiveAtOnce' | 'imagesPerPost' | 'bodyMaxChars', freeLimit: number, proLimit: number): string {
  const labels: Record<typeof limitKind, string> = {
    postsPerMonth: `${freeLimit} posts per month`,
    storiesLiveAtOnce: `${freeLimit} live ${freeLimit === 1 ? 'story' : 'stories'} at once`,
    imagesPerPost: `${freeLimit} ${freeLimit === 1 ? 'image' : 'images'} per post`,
    bodyMaxChars: `${freeLimit} characters per post`,
  }
  const proLabels: Record<typeof limitKind, string> = {
    postsPerMonth: `${proLimit} posts per month`,
    storiesLiveAtOnce: `${proLimit} live stories at once`,
    imagesPerPost: `${proLimit} images per post`,
    bodyMaxChars: `${proLimit} characters per post`,
  }
  return `You're on the free plan (${labels[limitKind]}). Pro raises this to ${proLabels[limitKind]}.`
}
