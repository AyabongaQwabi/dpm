import { describe, expect, it } from 'vitest'
import { profileCompleteness } from '../profile-completeness'

describe('profileCompleteness', () => {
  it('requires a bookable service as the highest value single-player activation item', () => {
    const result = profileCompleteness({
      isPublished: true,
      businessName: 'ABC Plumbing',
      bio: 'We help homeowners with reliable plumbing repairs, installations, and emergency callouts across the city.',
      profileImage: '/logo.jpg',
      locationCity: 'Johannesburg',
      phone: '0710000000',
      serviceCount: 0,
      galleryCount: 3,
      faqCount: 2,
      verificationCount: 1,
    })

    expect(result.percent).toBe(80)
    expect(result.nextItems[0]).toMatchObject({
      key: 'services',
      points: 20,
      href: '/provider-dashboard/services/new',
    })
  })

  it('returns 100% for a complete profile', () => {
    const result = profileCompleteness({
      isPublished: true,
      businessName: 'ABC Plumbing',
      bio: 'We help homeowners with reliable plumbing repairs, installations, and emergency callouts across Johannesburg and nearby suburbs.',
      profileImage: '/logo.jpg',
      locationCity: 'Johannesburg',
      phone: '0710000000',
      serviceCount: 1,
      galleryCount: 4,
      faqCount: 2,
      verificationCount: 2,
    })

    expect(result.score).toBe(result.total)
    expect(result.percent).toBe(100)
    expect(result.nextItems).toEqual([])
  })
})
