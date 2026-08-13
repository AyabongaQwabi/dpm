/**
 * Review gating rules.
 *
 * Pure — no DB, no framework imports (ARCH-006). Windows are passed in by the
 * caller from config/booking-lifecycle.json.
 */

export type ReviewStatus = 'published' | 'hidden' | 'flagged'

export interface ReviewEligibility {
  ok: boolean
  reason?: string
}

/**
 * May this customer write a review for this booking?
 *
 * A review can only be written by the customer on a booking with status
 * `completed`, one per booking. Mirrored in RLS — this is the friendly-message
 * layer, not the security boundary.
 */
export function canWriteReview(params: {
  bookingStatus: string
  bookingCustomerId: string
  actorCustomerId: string
  existingReview: boolean
}): ReviewEligibility {
  if (params.bookingCustomerId !== params.actorCustomerId) {
    return { ok: false, reason: 'You can only review your own bookings.' }
  }
  if (params.bookingStatus !== 'completed') {
    return {
      ok: false,
      reason: 'You can review this booking once it has been completed.',
    }
  }
  if (params.existingReview) {
    return { ok: false, reason: 'You have already reviewed this booking.' }
  }
  return { ok: true }
}

/** Is the customer still inside their edit window? */
export function canEditReview(params: {
  createdAt: string | Date
  editableForDays: number
  now?: Date
}): boolean {
  const created =
    params.createdAt instanceof Date ? params.createdAt : new Date(params.createdAt)
  const now = params.now ?? new Date()
  const locksAt = created.getTime() + params.editableForDays * 24 * 60 * 60 * 1000
  return now.getTime() < locksAt
}

/**
 * May the provider still edit their public reply? A provider replies once;
 * after the window the reply is fixed.
 */
export function canEditProviderReply(params: {
  repliedAt: string | Date | null
  editableForHours: number
  now?: Date
}): boolean {
  if (!params.repliedAt) return true // no reply yet — may post one

  const replied =
    params.repliedAt instanceof Date ? params.repliedAt : new Date(params.repliedAt)
  const now = params.now ?? new Date()
  const locksAt = replied.getTime() + params.editableForHours * 60 * 60 * 1000
  return now.getTime() < locksAt
}

/** Validate a headline rating. */
export function isValidRating(rating: unknown): rating is number {
  return Number.isInteger(rating) && (rating as number) >= 1 && (rating as number) <= 5
}

/** Validate an optional sub-rating: absent is always fine. */
export function isValidSubRating(rating: unknown): boolean {
  return rating === null || rating === undefined || isValidRating(rating)
}

export interface RatingDistribution {
  rating: number
  count: number
  percentage: number
}

/** Five-row distribution (5★ first) for the profile bar chart. */
export function ratingDistribution(ratings: number[]): RatingDistribution[] {
  const total = ratings.length

  return [5, 4, 3, 2, 1].map((rating) => {
    const count = ratings.filter((r) => Math.round(r) === rating).length
    return {
      rating,
      count,
      percentage: total === 0 ? 0 : Math.round((count / total) * 100),
    }
  })
}

/**
 * Should a rating be shown on a search or listing card? Below the configured
 * minimum review count, show nothing rather than a rating built on one opinion.
 */
export function shouldDisplayRating(params: {
  reviewCount: number
  minReviews: number
}): boolean {
  return params.reviewCount >= params.minReviews && params.reviewCount > 0
}

/** "Sarah M." — reviewer first name plus surname initial, never the full name. */
export function reviewerDisplayName(fullName: string | null | undefined): string {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Customer'
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}
