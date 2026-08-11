// Recommended services ranking (prompt Section 6).
// Pure functions — no DB/framework imports (mirrors ARCH-006).
//
// Design decisions encoded here:
// - Volume floor: a service must have min_reviews_for_recommendation reviews
//   before it's eligible (configurable via platform_config, not hardcoded).
// - Four weighted signals: recency-weighted rating, booking volume,
//   provider reliability penalty, completion-to-review ratio.
// - New services (< floor) aren't penalised — they're just not yet eligible.
// - Package tier of reviewer is NOT a weighting factor (see prompt Section 5
//   review design rationale).

import { ConfigStore, CONFIG_KEYS, getConfigNumber } from './config'

export interface ServiceRankingInput {
  serviceId: string
  isPublished: boolean
  // Reviews for this service with their ages in days
  reviews: { rating: number; ageInDays: number }[]
  // Number of completed bookings for this service
  completedBookings: number
  // Provider-level reliability penalty (0–1, higher = worse)
  providerReliabilityPenalty: number
}

export interface RankedService {
  serviceId: string
  score: number
  eligible: boolean
}

// Exponential decay: weight of a review diminishes by half every `halfLifeDays`
function decayWeight(ageInDays: number, halfLifeDays: number): number {
  return Math.pow(0.5, ageInDays / halfLifeDays)
}

// Recency-weighted average rating, normalised to 0–1
function recencyWeightedRating(reviews: { rating: number; ageInDays: number }[], halfLifeDays: number): number {
  if (reviews.length === 0) return 0
  let weightedSum = 0
  let totalWeight = 0
  for (const r of reviews) {
    const w = decayWeight(r.ageInDays, halfLifeDays)
    weightedSum += r.rating * w
    totalWeight += w
  }
  if (totalWeight === 0) return 0
  // Rating scale: 1–5 → normalise to 0–1
  return Math.max(0, Math.min(1, (weightedSum / totalWeight - 1) / 4))
}

// Booking volume signal: log-normalised so volume differences don't dominate
function bookingVolumeSignal(completedBookings: number): number {
  if (completedBookings === 0) return 0
  // log₁₀(n+1) / log₁₀(101) ≈ normalised to 0–1 for up to 100 bookings
  return Math.min(1, Math.log10(completedBookings + 1) / Math.log10(101))
}

// Completion-to-review ratio: sanity check against review manipulation
// A service with many completions but very few reviews is suspicious.
// A ratio near 1 is healthiest (every customer leaves a review).
// We treat extremely low ratios as a signal of gaming, not a ranking boost.
function reviewRatioSignal(completedBookings: number, reviewCount: number): number {
  if (completedBookings === 0) return 0.5 // neutral — not enough data
  const ratio = reviewCount / completedBookings
  // Penalise <10% review rate, neutral at 20%+, cap at 1
  return Math.min(1, Math.max(0, ratio / 0.2))
}

export async function rankServices(
  candidates: ServiceRankingInput[],
  config: ConfigStore,
): Promise<RankedService[]> {
  const [
    minReviews,
    wRecencyRating,
    wBookingVolume,
    wReliability,
    wReviewRatio,
    halfLife,
  ] = await Promise.all([
    getConfigNumber(config, CONFIG_KEYS.MIN_REVIEWS_FOR_RECOMMENDATION),
    getConfigNumber(config, CONFIG_KEYS.RECOMMENDATION_WEIGHT_RECENCY_RATING),
    getConfigNumber(config, CONFIG_KEYS.RECOMMENDATION_WEIGHT_BOOKING_VOLUME),
    getConfigNumber(config, CONFIG_KEYS.RECOMMENDATION_WEIGHT_RELIABILITY),
    getConfigNumber(config, CONFIG_KEYS.RECOMMENDATION_WEIGHT_REVIEW_RATIO),
    getConfigNumber(config, CONFIG_KEYS.RECOMMENDATION_RECENCY_HALF_LIFE_DAYS),
  ])

  const results: RankedService[] = []

  for (const svc of candidates) {
    if (!svc.isPublished) continue

    const reviewCount = svc.reviews.length
    const eligible = reviewCount >= minReviews

    const recencyRating = recencyWeightedRating(svc.reviews, halfLife)
    const volumeSignal = bookingVolumeSignal(svc.completedBookings)
    const reliabilityPenalty = Math.min(1, Math.max(0, svc.providerReliabilityPenalty))
    const ratioSignal = reviewRatioSignal(svc.completedBookings, reviewCount)

    // Positive signals weighted and summed
    const positiveScore =
      recencyRating * wRecencyRating +
      volumeSignal * wBookingVolume +
      ratioSignal * wReviewRatio

    // Reliability penalty subtracted (higher penalty = lower score)
    const score = Math.max(0, Math.min(1, positiveScore - reliabilityPenalty * wReliability))

    results.push({ serviceId: svc.serviceId, score, eligible })
  }

  // Sort eligible first by score descending, then ineligible by score (they're excluded from surface)
  results.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1
    return b.score - a.score
  })

  return results
}
