import { describe, it, expect } from 'vitest'
import {
  canAfford,
  shortfall,
  assertPositiveCredits,
  parseCreditPurchaseMetadata,
  isValidCreditPurchaseVerification,
} from '../credits'

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

describe('parseCreditPurchaseMetadata', () => {
  it('parses base and bonus credits from metadata', () => {
    expect(parseCreditPurchaseMetadata({
      credit_amount: 500,
      bonus_credits: 50,
    })).toEqual({ baseCredits: 500, bonusCredits: 50, totalCredits: 550 })
  })

  it('defaults missing bonus to zero', () => {
    expect(parseCreditPurchaseMetadata({ credit_amount: '250' })).toEqual({
      baseCredits: 250,
      bonusCredits: 0,
      totalCredits: 250,
    })
  })
})

describe('isValidCreditPurchaseVerification', () => {
  const customerId = 'cust_123'

  it('accepts successful credit purchase for matching customer', () => {
    expect(isValidCreditPurchaseVerification('success', {
      type: 'credit_purchase',
      customer_id: customerId,
      credit_amount: 100,
    }, customerId)).toBe(true)
  })

  it('rejects wrong status, type, or customer', () => {
    const metadata = {
      type: 'credit_purchase',
      customer_id: customerId,
      credit_amount: 100,
    }
    expect(isValidCreditPurchaseVerification('failed', metadata, customerId)).toBe(false)
    expect(isValidCreditPurchaseVerification('success', { ...metadata, type: 'other' }, customerId)).toBe(false)
    expect(isValidCreditPurchaseVerification('success', metadata, 'other')).toBe(false)
    expect(isValidCreditPurchaseVerification('success', { ...metadata, credit_amount: 0 }, customerId)).toBe(false)
  })
})
