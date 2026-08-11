import { describe, it, expect } from 'vitest'
import {
  canPublishMorePosts,
  canPublishMoreStories,
  isWithinImageLimit,
  isWithinBodyLimit,
  isWithinStoryBodyLimit,
  storyBodyLimitForMedia,
  computeExpiresAt,
  isExpired,
  isPubliclyVisible,
  type PublishingLimits,
} from '../provider-posts'

const FREE_LIMITS: PublishingLimits = {
  postsPerMonth: 2,
  storiesLiveAtOnce: 1,
  imagesPerPost: 1,
  bodyMaxChars: 1500,
  storyTextMaxChars: 280,
  storyCaptionMaxChars: 120,
}

const PRO_LIMITS: PublishingLimits = {
  postsPerMonth: 20,
  storiesLiveAtOnce: 5,
  imagesPerPost: 10,
  bodyMaxChars: 5000,
  storyTextMaxChars: 280,
  storyCaptionMaxChars: 120,
}

// ---------- Free vs Pro caps ----------

describe('canPublishMorePosts', () => {
  it('blocks a free provider at the monthly post cap', () => {
    expect(canPublishMorePosts(2, FREE_LIMITS)).toBe(false)
  })

  it('allows a free provider under the cap', () => {
    expect(canPublishMorePosts(1, FREE_LIMITS)).toBe(true)
  })

  it('does not block a Pro provider at the free-tier cap', () => {
    expect(canPublishMorePosts(2, PRO_LIMITS)).toBe(true)
  })
})

describe('canPublishMoreStories', () => {
  it('blocks at the live-story cap', () => {
    expect(canPublishMoreStories(1, FREE_LIMITS)).toBe(false)
    expect(canPublishMoreStories(5, PRO_LIMITS)).toBe(false)
  })

  it('allows under the cap', () => {
    expect(canPublishMoreStories(0, FREE_LIMITS)).toBe(true)
    expect(canPublishMoreStories(4, PRO_LIMITS)).toBe(true)
  })
})

describe('isWithinImageLimit / isWithinBodyLimit', () => {
  it('enforces the free-tier image cap', () => {
    expect(isWithinImageLimit(1, FREE_LIMITS)).toBe(true)
    expect(isWithinImageLimit(2, FREE_LIMITS)).toBe(false)
  })

  it('enforces the free-tier body length cap', () => {
    expect(isWithinBodyLimit(1500, FREE_LIMITS)).toBe(true)
    expect(isWithinBodyLimit(1501, FREE_LIMITS)).toBe(false)
  })
})

describe('story body limits', () => {
  it('uses the text-only story limit when no image is attached', () => {
    expect(storyBodyLimitForMedia(0, FREE_LIMITS)).toBe(280)
    expect(isWithinStoryBodyLimit(280, 0, FREE_LIMITS)).toBe(true)
    expect(isWithinStoryBodyLimit(281, 0, FREE_LIMITS)).toBe(false)
  })

  it('uses the shorter caption limit when a story has an image', () => {
    expect(storyBodyLimitForMedia(1, FREE_LIMITS)).toBe(120)
    expect(isWithinStoryBodyLimit(120, 1, FREE_LIMITS)).toBe(true)
    expect(isWithinStoryBodyLimit(121, 1, FREE_LIMITS)).toBe(false)
  })
})

// ---------- Story expiry ----------

describe('computeExpiresAt', () => {
  it('sets expires_at 24h out for a story', () => {
    const publishedAt = new Date('2026-01-01T00:00:00Z')
    const expiresAt = computeExpiresAt('story', publishedAt)
    expect(expiresAt).not.toBeNull()
    expect(expiresAt!.getTime() - publishedAt.getTime()).toBe(24 * 60 * 60 * 1000)
  })

  it('does not set expires_at for a post', () => {
    expect(computeExpiresAt('post', new Date())).toBeNull()
  })
})

describe('isExpired', () => {
  it('returns false for a null expiry (posts)', () => {
    expect(isExpired(null)).toBe(false)
  })

  it('returns true once past expires_at', () => {
    const now = new Date('2026-01-02T00:00:00Z')
    expect(isExpired('2026-01-01T00:00:00Z', now)).toBe(true)
  })

  it('returns false before expires_at', () => {
    const now = new Date('2026-01-01T12:00:00Z')
    expect(isExpired('2026-01-02T00:00:00Z', now)).toBe(false)
  })
})

// ---------- Public visibility (mirrors the RLS policy) ----------

describe('isPubliclyVisible', () => {
  it('returns false for draft, expired, or removed', () => {
    expect(isPubliclyVisible('draft', 'passed')).toBe(false)
    expect(isPubliclyVisible('expired', 'passed')).toBe(false)
    expect(isPubliclyVisible('removed', 'passed')).toBe(false)
  })

  it('returns false for published-but-flagged-or-removed moderation', () => {
    expect(isPubliclyVisible('published', 'flagged')).toBe(false)
    expect(isPubliclyVisible('published', 'removed')).toBe(false)
  })

  it('returns true only for published + passed', () => {
    expect(isPubliclyVisible('published', 'passed')).toBe(true)
  })
})
