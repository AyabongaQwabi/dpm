import { describe, expect, it } from 'vitest'
import {
  earliestProviderResponse,
  isLiquidCell,
  median,
  respondedWithin24h,
  responseMinutes,
} from '../liquidity'

const THRESHOLDS = {
  minProvidersPerCell: 8,
  minResponseRate24h: 0.8,
  minCompletedBookings30d: 1,
}

describe('isLiquidCell', () => {
  it('is liquid when every threshold clears', () => {
    expect(
      isLiquidCell({ providerCount: 8, completedBookings30d: 1, responseRate24h: 0.8 }, THRESHOLDS),
    ).toBe(true)
  })

  it('is not liquid when provider count is short', () => {
    expect(
      isLiquidCell({ providerCount: 7, completedBookings30d: 5, responseRate24h: 1 }, THRESHOLDS),
    ).toBe(false)
  })

  it('is not liquid when completed bookings are short', () => {
    expect(
      isLiquidCell({ providerCount: 20, completedBookings30d: 0, responseRate24h: 1 }, THRESHOLDS),
    ).toBe(false)
  })

  it('is not liquid when response rate is short', () => {
    expect(
      isLiquidCell({ providerCount: 20, completedBookings30d: 5, responseRate24h: 0.79 }, THRESHOLDS),
    ).toBe(false)
  })

  it('is not liquid when there is no response-time data at all', () => {
    expect(
      isLiquidCell({ providerCount: 20, completedBookings30d: 5, responseRate24h: null }, THRESHOLDS),
    ).toBe(false)
  })
})

describe('earliestProviderResponse', () => {
  it('picks the minimum timestamp across both systems', () => {
    expect(
      earliestProviderResponse(['2026-08-13T10:00:00Z', '2026-08-13T09:00:00Z', null, undefined]),
    ).toBe('2026-08-13T09:00:00Z')
  })

  it('returns null when nothing responded', () => {
    expect(earliestProviderResponse([null, undefined])).toBeNull()
  })
})

describe('respondedWithin24h', () => {
  it('is true at exactly 24h', () => {
    expect(respondedWithin24h('2026-08-13T00:00:00Z', '2026-08-14T00:00:00Z')).toBe(true)
  })

  it('is false just past 24h', () => {
    expect(respondedWithin24h('2026-08-13T00:00:00Z', '2026-08-14T00:00:01Z')).toBe(false)
  })

  it('is false when there is no response', () => {
    expect(respondedWithin24h('2026-08-13T00:00:00Z', null)).toBe(false)
  })
})

describe('responseMinutes', () => {
  it('computes whole minutes elapsed', () => {
    expect(responseMinutes('2026-08-13T00:00:00Z', '2026-08-13T01:30:00Z')).toBe(90)
  })

  it('never goes negative', () => {
    expect(responseMinutes('2026-08-13T01:00:00Z', '2026-08-13T00:00:00Z')).toBe(0)
  })
})

describe('median', () => {
  it('returns null for an empty list', () => {
    expect(median([])).toBeNull()
  })

  it('returns the middle value for an odd-length list', () => {
    expect(median([1, 3, 2])).toBe(2)
  })

  it('averages the two middle values for an even-length list', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })
})
