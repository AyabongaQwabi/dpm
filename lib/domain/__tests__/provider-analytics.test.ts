import { describe, expect, it } from 'vitest'
import { buildProviderAnalyticsRangeSummary } from '../provider-analytics'

describe('buildProviderAnalyticsRangeSummary', () => {
  const provider = {
    profileViews: 12,
    serviceViews: 8,
    bookingsStarted: 4,
    bookingsCompleted: 2,
    reviewCount: 1,
    averageRating: 5,
    medianResponseMinutes: 30,
  }

  it('suppresses medians when the category-city sample is below the configured minimum', () => {
    const summary = buildProviderAnalyticsRangeSummary({
      days: 7,
      provider,
      peerCounts: [provider],
      minComparisonSample: 5,
    })

    expect(summary.metrics.every((metric) => metric.median === null)).toBe(true)
  })

  it('computes peer medians when the category-city sample meets the configured minimum', () => {
    const summary = buildProviderAnalyticsRangeSummary({
      days: 7,
      provider,
      peerCounts: [
        { ...provider, profileViews: 2, bookingsStarted: 1, bookingsCompleted: 1 },
        { ...provider, profileViews: 4, bookingsStarted: 2, bookingsCompleted: 1 },
        { ...provider, profileViews: 6, bookingsStarted: 4, bookingsCompleted: 2 },
        { ...provider, profileViews: 8, bookingsStarted: 4, bookingsCompleted: 4 },
        { ...provider, profileViews: 10, bookingsStarted: 10, bookingsCompleted: 5 },
      ],
      minComparisonSample: 5,
    })

    expect(summary.metrics.find((metric) => metric.key === 'profileViews')?.median).toBe(6)
    expect(summary.metrics.find((metric) => metric.key === 'bookingConversionRate')?.median).toBe(0.5)
  })
})
