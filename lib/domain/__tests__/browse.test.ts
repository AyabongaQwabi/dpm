import { describe, expect, it } from 'vitest'
import { filterVisibleTiles, isTileVisible } from '../browse'
import { seoIndexPolicy } from '../../seo'

describe('isTileVisible', () => {
  it('hides a category with 4 providers when the threshold is 5', () => {
    expect(isTileVisible(4, 5)).toBe(false)
  })

  it('shows a category with 5 providers when the threshold is 5', () => {
    expect(isTileVisible(5, 5)).toBe(true)
  })
})

describe('filterVisibleTiles', () => {
  it('drops tiles below the threshold and keeps tiles at or above it', () => {
    const tiles = [
      { slug: 'dealerships', providerCount: 0 },
      { slug: 'pets', providerCount: 4 },
      { slug: 'home', providerCount: 5 },
      { slug: 'events', providerCount: 412 },
    ]
    expect(filterVisibleTiles(tiles, 5).map((t) => t.slug)).toEqual(['home', 'events'])
  })
})

describe('category/city page reachability + indexability at the threshold', () => {
  it('a below-threshold page stays reachable (robots noindex,follow — never a 404 substitute)', () => {
    expect(seoIndexPolicy(4, 5)).toEqual({ index: false, follow: true })
  })

  it('an at-or-above-threshold page is indexable (undefined robots = inherit index,follow)', () => {
    expect(seoIndexPolicy(5, 5)).toBeUndefined()
  })
})
