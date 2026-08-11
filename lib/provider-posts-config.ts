/**
 * Provider posts & stories limits — free tier is the default for every
 * provider, not the exception. pro.publishing_limits raises these numbers;
 * it never gates publishing itself.
 *
 * All numbers sourced from config/publishing-limits.json — edit that file
 * to change a limit; a deploy is required to pick it up (static import,
 * same convention as config/feature-pauses.json).
 */

import publishingLimitsConfig from '@/config/publishing-limits.json'

export interface PublishingLimits {
  postsPerMonth: number
  storiesLiveAtOnce: number
  imagesPerPost: number
  bodyMaxChars: number
}

export const FREE_TIER_PUBLISHING_LIMITS: PublishingLimits = publishingLimitsConfig.free

export const PRO_PUBLISHING_LIMITS: PublishingLimits = publishingLimitsConfig.pro

export function getPublishingLimits(isPro: boolean): PublishingLimits {
  return isPro ? PRO_PUBLISHING_LIMITS : FREE_TIER_PUBLISHING_LIMITS
}

/** How long a published story stays live before expiring — passed to lib/domain/provider-posts.ts's computeExpiresAt(). */
export const STORY_LIFETIME_MS = publishingLimitsConfig.storyLifetimeHours * 60 * 60 * 1000

/** How long expired story media is retained before it can be purged (dispute window). */
export const EXPIRED_STORY_MEDIA_RETENTION_DAYS = publishingLimitsConfig.expiredStoryMediaRetentionDays
