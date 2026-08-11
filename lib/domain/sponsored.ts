// Pure sponsored-placement logic — no DB/framework imports.
//
// Rule 2: sponsored placement is bought time, never bought leads or rank.
// Nothing here computes a bid, a cost-per-click, or a rank score — a
// sponsored slot is a flat-rate reservation, full stop. Enforcement lives
// here (server-checkable) and is re-verified at render time, not just at
// purchase.

export type SponsoredPlacementType = 'category_city_feature' | 'floating_box' | 'search_top_slot'
export type SponsoredPlacementSource = 'purchased' | 'rescue_grant'
export type SponsoredPlacementStatus = 'active' | 'paused' | 'expired' | 'cancelled'

export interface SponsoredEligibilityInput {
  hasContactVerification: boolean
  hasOpenDispute: boolean
  averageRating: number | null
  minRatingThreshold: number
}

/**
 * C.2 eligibility: Contact verification current, no open disputes, rating
 * not below the configured threshold. A provider with no ratings yet
 * (averageRating === null) is treated as eligible — absence of data is not
 * the same as a low rating.
 */
export function isEligibleForSponsoredPlacement(input: SponsoredEligibilityInput): boolean {
  if (!input.hasContactVerification) return false
  if (input.hasOpenDispute) return false
  if (input.averageRating !== null && input.averageRating < input.minRatingThreshold) return false
  return true
}

/**
 * C.2 reserve rule: given a placement type's total slot count and the
 * reserve percentage (config-driven, default 30%), how many slots are
 * reserved for rescue_grant vs. sellable. Paid inventory can never consume
 * a reserved slot — callers must check this before accepting a purchase.
 */
export function reservedSlotCount(totalSlots: number, reservePct: number): number {
  return Math.ceil(totalSlots * (reservePct / 100))
}

export function sellableSlotCount(totalSlots: number, reservePct: number): number {
  return Math.max(0, totalSlots - reservedSlotCount(totalSlots, reservePct))
}

/**
 * Whether accepting one more purchased placement of a given type, given how
 * many total slots exist and how many are already sold (purchased, active),
 * would eat into the reserved rescue_grant pool.
 */
export function canSellAnotherSlot(
  totalSlots: number,
  currentlySoldCount: number,
  reservePct: number,
): boolean {
  return currentlySoldCount < sellableSlotCount(totalSlots, reservePct)
}

/**
 * C.2 density cap: no more than one sponsored slot per ten organic results.
 * Returns the max number of sponsored items allowed to be interleaved into
 * a list of the given organic length.
 */
export function maxSponsoredForOrganicCount(organicCount: number, capPerTen: number): number {
  return Math.floor(organicCount / 10) * capPerTen
}

/**
 * Unused-time credit (C.2): when a placement is paused mid-flight for
 * falling below eligibility, how many seconds of its reserved window remain
 * unused as of `pausedAt`. Callers add this to credited_seconds so the
 * unused time can be reinstated (extend ends_at) once eligibility returns.
 */
export function unusedSecondsAt(endsAt: Date, pausedAt: Date): number {
  const diffMs = endsAt.getTime() - pausedAt.getTime()
  return Math.max(0, Math.floor(diffMs / 1000))
}
