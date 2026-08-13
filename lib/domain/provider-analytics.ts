import { median } from './liquidity'

export const ANALYTICS_RANGE_DAYS = [7, 30, 90] as const

export type AnalyticsRangeDays = (typeof ANALYTICS_RANGE_DAYS)[number]

export type AnalyticsMetricKey =
  | 'profileViews'
  | 'serviceViews'
  | 'bookingsStarted'
  | 'bookingsCompleted'
  | 'bookingConversionRate'
  | 'reviewCount'
  | 'averageRating'
  | 'medianResponseMinutes'

export interface ProviderAnalyticsMetric {
  key: AnalyticsMetricKey
  label: string
  value: number | null
  median: number | null
  comparisonSampleSize: number
  unit: 'count' | 'percent' | 'rating' | 'minutes'
}

export interface ProviderAnalyticsRangeSummary {
  days: AnalyticsRangeDays
  metrics: ProviderAnalyticsMetric[]
}

export interface ProviderAnalyticsAccess {
  allowed: boolean
}

export interface ProviderAnalyticsSummary {
  access: ProviderAnalyticsAccess
  ranges: ProviderAnalyticsRangeSummary[]
  comparisonUnavailableReason: string | null
}

export interface ProviderAnalyticsCounts {
  profileViews: number
  serviceViews: number
  bookingsStarted: number
  bookingsCompleted: number
  reviewCount: number
  averageRating: number | null
  medianResponseMinutes: number | null
}

export function bookingConversionRate(started: number, completed: number): number | null {
  if (started <= 0) return null
  return completed / started
}

export function buildProviderAnalyticsRangeSummary(input: {
  days: AnalyticsRangeDays
  provider: ProviderAnalyticsCounts
  peerCounts: ProviderAnalyticsCounts[]
  minComparisonSample: number
}): ProviderAnalyticsRangeSummary {
  const sampleSize = input.peerCounts.length
  const includeComparison = sampleSize >= input.minComparisonSample

  function comparison(values: Array<number | null>): number | null {
    if (!includeComparison) return null
    return median(values.filter((value): value is number => value !== null))
  }

  const providerConversion = bookingConversionRate(input.provider.bookingsStarted, input.provider.bookingsCompleted)
  const peerConversions = input.peerCounts.map((counts) =>
    bookingConversionRate(counts.bookingsStarted, counts.bookingsCompleted),
  )

  return {
    days: input.days,
    metrics: [
      {
        key: 'profileViews',
        label: 'Profile views',
        value: input.provider.profileViews,
        median: comparison(input.peerCounts.map((counts) => counts.profileViews)),
        comparisonSampleSize: sampleSize,
        unit: 'count',
      },
      {
        key: 'serviceViews',
        label: 'Service views',
        value: input.provider.serviceViews,
        median: comparison(input.peerCounts.map((counts) => counts.serviceViews)),
        comparisonSampleSize: sampleSize,
        unit: 'count',
      },
      {
        key: 'bookingsStarted',
        label: 'Bookings started',
        value: input.provider.bookingsStarted,
        median: comparison(input.peerCounts.map((counts) => counts.bookingsStarted)),
        comparisonSampleSize: sampleSize,
        unit: 'count',
      },
      {
        key: 'bookingsCompleted',
        label: 'Bookings completed',
        value: input.provider.bookingsCompleted,
        median: comparison(input.peerCounts.map((counts) => counts.bookingsCompleted)),
        comparisonSampleSize: sampleSize,
        unit: 'count',
      },
      {
        key: 'bookingConversionRate',
        label: 'Booking conversion',
        value: providerConversion,
        median: comparison(peerConversions),
        comparisonSampleSize: sampleSize,
        unit: 'percent',
      },
      {
        key: 'reviewCount',
        label: 'Reviews',
        value: input.provider.reviewCount,
        median: comparison(input.peerCounts.map((counts) => counts.reviewCount)),
        comparisonSampleSize: sampleSize,
        unit: 'count',
      },
      {
        key: 'averageRating',
        label: 'Average rating',
        value: input.provider.averageRating,
        median: comparison(input.peerCounts.map((counts) => counts.averageRating)),
        comparisonSampleSize: sampleSize,
        unit: 'rating',
      },
      {
        key: 'medianResponseMinutes',
        label: 'Median response time',
        value: input.provider.medianResponseMinutes,
        median: comparison(input.peerCounts.map((counts) => counts.medianResponseMinutes)),
        comparisonSampleSize: sampleSize,
        unit: 'minutes',
      },
    ],
  }
}
