import { describe, expect, it } from 'vitest'
import {
  defaultQuoteValidityDate,
  normaliseQuoteLineItems,
} from '../custom-quotes'

describe('normaliseQuoteLineItems', () => {
  it('computes totals from structured line items', () => {
    const result = normaliseQuoteLineItems({
      rawItems: [
        { description: 'Site inspection', quantity: 1, unitPrice: 750 },
        { description: 'Labour', quantity: 2.5, unitPrice: 400 },
      ],
      minItems: 1,
      maxItems: 5,
    })

    expect(result.ok).toBe(true)
    expect(result.totalAmount).toBe(1750)
    expect(result.lineItems).toEqual([
      { description: 'Site inspection', quantity: 1, unit_price: 750, line_total: 750 },
      { description: 'Labour', quantity: 2.5, unit_price: 400, line_total: 1000 },
    ])
  })

  it('rejects free-form or non-positive line items', () => {
    expect(normaliseQuoteLineItems({
      rawItems: 'R5000 all in',
      minItems: 1,
      maxItems: 5,
    }).ok).toBe(false)

    expect(normaliseQuoteLineItems({
      rawItems: [{ description: 'Work', quantity: 1, unitPrice: 0 }],
      minItems: 1,
      maxItems: 5,
    }).ok).toBe(false)
  })

  it('enforces configured item-count bounds', () => {
    expect(normaliseQuoteLineItems({
      rawItems: [],
      minItems: 1,
      maxItems: 2,
    }).ok).toBe(false)

    expect(normaliseQuoteLineItems({
      rawItems: [
        { description: 'One', quantity: 1, unitPrice: 1 },
        { description: 'Two', quantity: 1, unitPrice: 1 },
        { description: 'Three', quantity: 1, unitPrice: 1 },
      ],
      minItems: 1,
      maxItems: 2,
    }).ok).toBe(false)
  })
})

describe('defaultQuoteValidityDate', () => {
  it('adds configured days and returns an ISO date', () => {
    expect(defaultQuoteValidityDate(14, new Date('2026-08-13T10:00:00Z'))).toBe('2026-08-27')
  })
})
