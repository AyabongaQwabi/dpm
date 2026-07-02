import { describe, it, expect } from 'vitest'
import {
  calculatePurchaseCredits,
  getActivePromotion,
  type CreditPromotion,
} from '../credit-promotions'

const launchPromo: CreditPromotion = {
  id: 'launch-bonus-2026',
  name: 'Launch offer',
  description: 'Get 15% extra credits on every purchase',
  type: 'percentage_bonus',
  value: 15,
  applies_to: 'all',
  active: true,
}

const inactivePromo: CreditPromotion = {
  ...launchPromo,
  id: 'inactive',
  active: false,
}

describe('getActivePromotion', () => {
  it('returns the first active promotion with applies_to all', () => {
    expect(getActivePromotion([inactivePromo, launchPromo])).toEqual(launchPromo)
  })

  it('returns null when no active promotion', () => {
    expect(getActivePromotion([inactivePromo])).toBeNull()
  })

  it('ignores promotions that do not apply to all', () => {
    const fixedOnly: CreditPromotion = { ...launchPromo, applies_to: 'fixed_only' }
    expect(getActivePromotion([fixedOnly])).toBeNull()
  })
})

describe('calculatePurchaseCredits', () => {
  it('awards 15 bonus credits on R100 @ 15%', () => {
    const result = calculatePurchaseCredits(100, [launchPromo])
    expect(result.baseCredits).toBe(100)
    expect(result.bonusCredits).toBe(15)
    expect(result.totalCredits).toBe(115)
    expect(result.promotion).toEqual(launchPromo)
  })

  it('floors bonus credits — R73 @ 15% → 10 bonus, 83 total', () => {
    const result = calculatePurchaseCredits(73, [launchPromo])
    expect(result.baseCredits).toBe(73)
    expect(result.bonusCredits).toBe(10)
    expect(result.totalCredits).toBe(83)
  })

  it('returns no bonus when promotion is inactive', () => {
    const result = calculatePurchaseCredits(100, [inactivePromo])
    expect(result.bonusCredits).toBe(0)
    expect(result.totalCredits).toBe(100)
    expect(result.promotion).toBeNull()
  })
})
