import { describe, it, expect } from 'vitest'
import { canAfford, shortfall, assertPositiveCredits } from '../credits'

describe('canAfford', () => {
  it('returns true when balance covers rounded price', () => {
    expect(canAfford(500, 499.6)).toBe(true)
    expect(canAfford(500, 500)).toBe(true)
  })

  it('returns false when balance is insufficient', () => {
    expect(canAfford(499, 500)).toBe(false)
    expect(canAfford(0, 1)).toBe(false)
  })
})

describe('shortfall', () => {
  it('returns zero when balance is sufficient', () => {
    expect(shortfall(1000, 500)).toBe(0)
    expect(shortfall(500, 499.4)).toBe(0)
  })

  it('returns the gap in whole credits', () => {
    expect(shortfall(400, 500)).toBe(100)
    expect(shortfall(0, 250)).toBe(250)
    expect(shortfall(499, 500.4)).toBe(1)
  })
})

describe('assertPositiveCredits', () => {
  it('accepts positive integers', () => {
    expect(() => assertPositiveCredits(50)).not.toThrow()
  })

  it('rejects zero and negative amounts', () => {
    expect(() => assertPositiveCredits(0)).toThrow(RangeError)
    expect(() => assertPositiveCredits(-10)).toThrow(RangeError)
  })

  it('rejects non-finite values', () => {
    expect(() => assertPositiveCredits(NaN)).toThrow(RangeError)
    expect(() => assertPositiveCredits(Infinity)).toThrow(RangeError)
  })
})
