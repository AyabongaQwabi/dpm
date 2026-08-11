/**
 * Sponsored & featured inventory configuration (Batch C).
 *
 * All numbers sourced from config/sponsored-placements.json — edit that
 * file to change a price or rule; a deploy is required to pick it up
 * (static import, same convention as config/feature-pauses.json). This
 * does NOT mirror anything in the platform_config DB table — there is no
 * corresponding entry there; the JSON file is the only source of truth.
 *
 * Open-question decisions now live here too: one visible slot per placement
 * surface, hourly deterministic rotation, one-day visitor dismissal for the
 * floating box, and a 10-reservation inventory pool per scope so the 30%
 * rescue reserve does not make a one-visible-slot surface unsellable.
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
export const SPONSORED_VISIBLE_SLOTS: Record<SponsoredPlacementType, number> = sponsoredConfig.visibleSlots
export const SPONSORED_SLOT_INVENTORY_PER_SCOPE: Record<SponsoredPlacementType, number> =
  sponsoredConfig.slotInventoryPerScope
export const SPONSORED_FLOATING_BOX_DISMISSAL_HOURS = sponsoredConfig.floatingBoxDismissalHours
export const SPONSORED_ROTATION_WINDOW_HOURS = sponsoredConfig.rotationWindowHours

/**
 * C.3 open-question answers, kept as data so product decisions are visible
 * and testable instead of buried in component copy.
 */
export const SPONSORED_FLOATING_BOX_DECISIONS = {
  visibleProviders: sponsoredConfig.visibleSlots.floating_box,
  rotation: 'deterministic_hourly',
  dismissal: 'visitor_can_dismiss_for_current_day',
  placement: 'bottom_right_desktop_bottom_sheet_mobile',
  priceSource: 'config/sponsored-placements.json',
} as const
