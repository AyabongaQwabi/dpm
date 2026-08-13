import { describe, expect, it } from 'vitest'
import {
  canEditProviderReply,
  canEditReview,
  canWriteReview,
  isValidRating,
  isValidSubRating,
  ratingDistribution,
  reviewerDisplayName,
  shouldDisplayRating,
} from '../reviews'

describe('canWriteReview — the gate that makes reviews mean something', () => {
  const base = {
    bookingStatus: 'completed',
    bookingCustomerId: 'cust-1',
    actorCustomerId: 'cust-1',
    existingReview: false,
  }

  it('allows the customer to review their own completed booking', () => {
    expect(canWriteReview(base).ok).toBe(true)
  })

  it('refuses a booking that is not completed', () => {
    for (const status of [
      'requested',
      'accepted',
      'in_progress',
      'completed_by_provider',
      'cancelled',
      'declined',
      'disputed',
    ]) {
      const result = canWriteReview({ ...base, bookingStatus: status })
      expect(result.ok, status).toBe(false)
    }
  })

  it('refuses a second review on the same booking', () => {
    expect(canWriteReview({ ...base, existingReview: true }).ok).toBe(false)
  })

  it("refuses another customer's booking", () => {
    const result = canWriteReview({ ...base, actorCustomerId: 'cust-OTHER' })
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('your own')
  })
})

describe('canEditReview', () => {
  const createdAt = '2026-08-01T00:00:00Z'

  it('is editable inside the window', () => {
    expect(
      canEditReview({ createdAt, editableForDays: 14, now: new Date('2026-08-10T00:00:00Z') }),
    ).toBe(true)
  })

  it('locks once the window has passed', () => {
    expect(
      canEditReview({ createdAt, editableForDays: 14, now: new Date('2026-08-16T00:00:00Z') }),
    ).toBe(false)
  })
})

describe('canEditProviderReply', () => {
  it('allows a first reply when none exists', () => {
    expect(canEditProviderReply({ repliedAt: null, editableForHours: 24 })).toBe(true)
  })

  it('allows an edit inside the window', () => {
    expect(
      canEditProviderReply({
        repliedAt: '2026-08-01T00:00:00Z',
        editableForHours: 24,
        now: new Date('2026-08-01T10:00:00Z'),
      }),
    ).toBe(true)
  })

  it('locks the reply after the window', () => {
    expect(
      canEditProviderReply({
        repliedAt: '2026-08-01T00:00:00Z',
        editableForHours: 24,
        now: new Date('2026-08-02T01:00:00Z'),
      }),
    ).toBe(false)
  })
})

describe('rating validation', () => {
  it('accepts whole numbers 1 to 5', () => {
    for (const n of [1, 2, 3, 4, 5]) expect(isValidRating(n)).toBe(true)
  })

  it('rejects out-of-range, fractional and non-numeric values', () => {
    for (const bad of [0, 6, -1, 3.5, '4', null, undefined, NaN]) {
      expect(isValidRating(bad)).toBe(false)
    }
  })

  it('treats an absent sub-rating as valid — they are never required', () => {
    expect(isValidSubRating(null)).toBe(true)
    expect(isValidSubRating(undefined)).toBe(true)
    expect(isValidSubRating(4)).toBe(true)
    expect(isValidSubRating(9)).toBe(false)
  })
})

describe('ratingDistribution', () => {
  it('returns five rows, highest first, with percentages', () => {
    const dist = ratingDistribution([5, 5, 4, 1])
    expect(dist.map((d) => d.rating)).toEqual([5, 4, 3, 2, 1])
    expect(dist[0]).toEqual({ rating: 5, count: 2, percentage: 50 })
    expect(dist[1]).toEqual({ rating: 4, count: 1, percentage: 25 })
    expect(dist[2]).toEqual({ rating: 3, count: 0, percentage: 0 })
  })

  it('does not divide by zero on an empty list', () => {
    expect(ratingDistribution([]).every((d) => d.count === 0 && d.percentage === 0)).toBe(true)
  })
})

describe('shouldDisplayRating', () => {
  it('hides a rating below the configured threshold', () => {
    expect(shouldDisplayRating({ reviewCount: 2, minReviews: 3 })).toBe(false)
  })

  it('shows a rating at or above the threshold', () => {
    expect(shouldDisplayRating({ reviewCount: 3, minReviews: 3 })).toBe(true)
  })

  it('never shows a rating with zero reviews, whatever the threshold', () => {
    expect(shouldDisplayRating({ reviewCount: 0, minReviews: 0 })).toBe(false)
  })
})

describe('reviewerDisplayName', () => {
  it('shows a first name and surname initial only', () => {
    expect(reviewerDisplayName('Sarah Mokoena')).toBe('Sarah M.')
    expect(reviewerDisplayName('Ana Maria Da Silva')).toBe('Ana S.')
  })

  it('handles a single name and a missing name', () => {
    expect(reviewerDisplayName('Thabo')).toBe('Thabo')
    expect(reviewerDisplayName(null)).toBe('Customer')
    expect(reviewerDisplayName('   ')).toBe('Customer')
  })
})
