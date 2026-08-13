export interface ProfileCompletenessInput {
  isPublished: boolean
  businessName: string | null
  bio: string | null
  profileImage: string | null
  locationCity: string | null
  phone: string | null
  serviceCount: number
  galleryCount: number
  faqCount: number
  verificationCount: number
}

export interface ProfileCompletenessItem {
  key: string
  label: string
  points: number
  complete: boolean
  href: string
}

export function profileCompleteness(input: ProfileCompletenessInput): {
  score: number
  total: number
  percent: number
  items: ProfileCompletenessItem[]
  nextItems: ProfileCompletenessItem[]
} {
  const items: ProfileCompletenessItem[] = [
    {
      key: 'published',
      label: 'Publish your profile',
      points: 10,
      complete: input.isPublished,
      href: '/provider-dashboard/onboarding',
    },
    {
      key: 'identity',
      label: 'Add your business name',
      points: 10,
      complete: Boolean(input.businessName?.trim()),
      href: '/provider-dashboard/onboarding',
    },
    {
      key: 'bio',
      label: 'Write a clear business bio',
      points: 15,
      complete: Boolean(input.bio?.trim() && input.bio.trim().length >= 80),
      href: '/provider-dashboard/onboarding',
    },
    {
      key: 'profile_image',
      label: 'Add a logo or profile photo',
      points: 10,
      complete: Boolean(input.profileImage),
      href: '/provider-dashboard/onboarding',
    },
    {
      key: 'location_phone',
      label: 'Confirm location and phone',
      points: 15,
      complete: Boolean(input.locationCity?.trim() && input.phone?.trim()),
      href: '/provider-dashboard/onboarding',
    },
    {
      key: 'services',
      label: 'Create your first bookable service',
      points: 20,
      complete: input.serviceCount > 0,
      href: '/provider-dashboard/services/new',
    },
    {
      key: 'gallery',
      label: 'Upload at least 3 gallery photos',
      points: 10,
      complete: input.galleryCount >= 3,
      href: '/provider-dashboard/onboarding',
    },
    {
      key: 'faqs',
      label: 'Answer common customer questions',
      points: 5,
      complete: input.faqCount >= 2,
      href: '/provider-dashboard/onboarding',
    },
    {
      key: 'verification',
      label: 'Add at least one verification badge',
      points: 5,
      complete: input.verificationCount > 0,
      href: '/provider-dashboard/verification',
    },
  ]

  const total = items.reduce((sum, item) => sum + item.points, 0)
  const score = items.reduce((sum, item) => sum + (item.complete ? item.points : 0), 0)
  return {
    score,
    total,
    percent: total ? Math.round((score / total) * 100) : 0,
    items,
    nextItems: items.filter((item) => !item.complete).slice(0, 3),
  }
}
