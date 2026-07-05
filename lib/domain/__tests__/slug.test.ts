import { describe, expect, it } from 'vitest'
import { generateProviderSlug, slugifyName } from '../slug'

describe('slugifyName', () => {
  it('kebab-cases business names', () => {
    expect(slugifyName('Bright Clean & Co')).toBe('bright-clean-and-co')
  })

  it('strips leading and trailing hyphens', () => {
    expect(slugifyName('  --Joe\'s Cleaning--  ')).toBe('joe-s-cleaning')
  })
})

describe('generateProviderSlug', () => {
  it('returns base slug when unique and specific', () => {
    expect(
      generateProviderSlug({ businessName: 'Bright Clean Joburg' }),
    ).toBe('bright-clean-joburg')
  })

  it('appends city for generic names', () => {
    expect(
      generateProviderSlug({
        businessName: 'Cleaning Services',
        city: 'Johannesburg',
      }),
    ).toBe('cleaning-services-johannesburg')
  })

  it('suffixes on collision', () => {
    expect(
      generateProviderSlug({
        businessName: 'Joe Cleaning',
        city: 'Cape Town',
        existingSlugs: ['joe-cleaning', 'joe-cleaning-cape-town'],
      }),
    ).toBe('joe-cleaning-cape-town-2')
  })
})
