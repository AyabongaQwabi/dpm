import { describe, it, expect } from 'vitest'
import {
  membershipGrants,
  addOneMonth,
  addOneYear,
  daysRemaining,
  isWithinCancellationRefundWindow,
} from '../pro-membership'
import {
  ENTITLEMENT_KEYS,
  PACKAGE_NUMBERS_INCLUDING_PRO,
  PRO_CANCELLATION_REFUND_WINDOW_HOURS,
} from '../../entitlements'

// ---------- membershipGrants (hasEntitlement's pure core) ----------

describe('membershipGrants', () => {
  it('returns false for no membership', () => {
    expect(membershipGrants(null, ENTITLEMENT_KEYS.GALLERY_EXPANDED)).toBe(false)
  })

  it('returns false for a lapsed membership', () => {
    const membership = { status: 'lapsed' as const, source: 'purchased' as const, current_period_end: null }
    expect(membershipGrants(membership, ENTITLEMENT_KEYS.GALLERY_EXPANDED)).toBe(false)
  })

  it('returns false for a cancelled membership', () => {
    const membership = { status: 'cancelled' as const, source: 'purchased' as const, current_period_end: null }
    expect(membershipGrants(membership, ENTITLEMENT_KEYS.GALLERY_EXPANDED)).toBe(false)
  })

  it('returns true for an active purchased membership', () => {
    const membership = { status: 'active' as const, source: 'purchased' as const, current_period_end: null }
    expect(membershipGrants(membership, ENTITLEMENT_KEYS.GALLERY_EXPANDED)).toBe(true)
  })

  it('returns true for an active package_included membership', () => {
    const membership = { status: 'active' as const, source: 'package_included' as const, current_period_end: null }
    expect(membershipGrants(membership, ENTITLEMENT_KEYS.PUBLISHING_LIMITS)).toBe(true)
  })

  it('returns true for an active granted membership', () => {
    const membership = { status: 'active' as const, source: 'granted' as const, current_period_end: null }
    expect(membershipGrants(membership, ENTITLEMENT_KEYS.CUSTOM_SLUG)).toBe(true)
  })
})

// ---------- Package 2-5 inclusion rule ----------

describe('PACKAGE_NUMBERS_INCLUDING_PRO', () => {
  it('does not include package 1 (Starter/base)', () => {
    expect(PACKAGE_NUMBERS_INCLUDING_PRO).not.toContain(1)
  })

  it('includes packages 2 through 5', () => {
    expect(PACKAGE_NUMBERS_INCLUDING_PRO).toEqual([2, 3, 4, 5])
  })
})

// ---------- Period math ----------

describe('addOneMonth / addOneYear', () => {
  it('adds exactly one calendar month', () => {
    const from = new Date('2026-01-15T00:00:00Z')
    const result = addOneMonth(from)
    expect(result.getUTCMonth()).toBe(1) // February
    expect(result.getUTCDate()).toBe(15)
  })

  it('adds exactly one calendar year', () => {
    const from = new Date('2026-01-15T00:00:00Z')
    const result = addOneYear(from)
    expect(result.getUTCFullYear()).toBe(2027)
  })
})

describe('daysRemaining', () => {
  it('returns 0 for a period that already ended', () => {
    const now = new Date('2026-06-01T00:00:00Z')
    const periodEnd = new Date('2026-05-01T00:00:00Z')
    expect(daysRemaining(periodEnd, now)).toBe(0)
  })

  it('returns the correct day count for a future period end', () => {
    const now = new Date('2026-06-01T00:00:00Z')
    const periodEnd = new Date('2026-06-11T00:00:00Z')
    expect(daysRemaining(periodEnd, now)).toBe(10)
  })
})

// ---------- Cancellation refund window ----------

describe('isWithinCancellationRefundWindow', () => {
  it('is true immediately after purchase', () => {
    const startedAt = new Date('2026-06-01T00:00:00Z')
    const now = new Date('2026-06-01T00:00:01Z')
    expect(isWithinCancellationRefundWindow(startedAt, 24, now)).toBe(true)
  })

  it('is true just under the window boundary', () => {
    const startedAt = new Date('2026-06-01T00:00:00Z')
    const now = new Date('2026-06-01T23:59:59Z')
    expect(isWithinCancellationRefundWindow(startedAt, 24, now)).toBe(true)
  })

  it('is false exactly at the window boundary', () => {
    const startedAt = new Date('2026-06-01T00:00:00Z')
    const now = new Date('2026-06-02T00:00:00Z')
    expect(isWithinCancellationRefundWindow(startedAt, 24, now)).toBe(false)
  })

  it('is false well after the window', () => {
    const startedAt = new Date('2026-06-01T00:00:00Z')
    const now = new Date('2026-06-05T00:00:00Z')
    expect(isWithinCancellationRefundWindow(startedAt, 24, now)).toBe(false)
  })

  it('uses the configured 24-hour window', () => {
    expect(PRO_CANCELLATION_REFUND_WINDOW_HOURS).toBe(24)
  })
})
