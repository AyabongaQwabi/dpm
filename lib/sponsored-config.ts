/**
 * Sponsored & featured inventory configuration (Batch C).
 *
 * All numbers sourced from config/sponsored-placements.json — edit that
 * file to change a price or rule; a deploy is required to pick it up
 * (static import, same convention as config/feature-pauses.json). This
 * does NOT mirror anything in the platform_config DB table — there is no
 * corresponding entry there; the JSON file is the only source of truth.
 *
 * floating_box pricing is deliberately null. C.3 open questions (box count,
 * rotation method, dismissibility, screen placement) are still unanswered
 * — see SPONSORED_OPEN_QUESTIONS. category_city_feature and search_top_slot
 * pricing is confirmed (not a placeholder).
 */

import sponsoredConfig from '@/config/sponsored-placements.json'

export type SponsoredPlacementType = 'category_city_feature' | 'floating_box' | 'search_top_slot'

export interface SponsoredPricing {
  placementType: SponsoredPlacementType
  /** Rands (whole numbers only — debited from the provider credit wallet, 1 credit = R1). null = not yet priced — purchase is blocked until set. */
  price: number | null
  /** Billing unit this price covers, per C.1. */
  billingUnit: 'week' | 'month'
}

export const SPONSORED_PRICING: readonly SponsoredPricing[] = sponsoredConfig.pricing.map((p) => ({
  placementType: p.placementType as SponsoredPlacementType,
  price: p.priceRands,
  billingUnit: p.billingUnit as 'week' | 'month',
}))

export function getSponsoredPricing(placementType: SponsoredPlacementType): SponsoredPricing {
  const pricing = SPONSORED_PRICING.find((p) => p.placementType === placementType)
  if (!pricing) throw new Error(`Unknown placement type: ${placementType}`)
  return pricing
}

export function isSponsoredPlacementPurchasable(placementType: SponsoredPlacementType): boolean {
  return getSponsoredPricing(placementType).price !== null
}

export const SPONSORED_RESCUE_GRANT_RESERVE_PCT = sponsoredConfig.rescueGrantReservePct
export const SPONSORED_DENSITY_CAP_PER_TEN = sponsoredConfig.densityCapPerTen
export const SPONSORED_MIN_RATING_THRESHOLD = sponsoredConfig.minRatingThreshold

/**
 * C.3 open questions — not answered by the prior lifecycle spec, and not
 * guessed at here. Each of these gates a piece of floating_box behavior
 * that isn't built until answered:
 *
 * 1. How many sponsored providers appear at once in the floating box?
 * 2. Rotation method — random, round-robin, or weighted?
 * 3. Can a visitor dismiss the floating box, and does the dismissal persist?
 * 4. Where on screen does it sit, and what happens on mobile?
 * 5. Pricing for floating_box specifically (category_city_feature and
 *    search_top_slot pricing is confirmed — see config/sponsored-placements.json).
 *
 * The floating_box UI component is intentionally NOT built in this batch —
 * see the Batch C report. category_city_feature and search_top_slot don't
 * depend on these open questions and are built.
 */
export const SPONSORED_OPEN_QUESTIONS = [
  'floating_box: concurrent slot count',
  'floating_box: rotation method',
  'floating_box: dismissibility + persistence',
  'floating_box: screen placement + mobile behavior',
  'floating_box: pricing',
] as const
