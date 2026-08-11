/**
 * JSON-backed ConfigStore — replaces the platform_config DB table.
 *
 * There is no tenant-admin system yet to justify a DB-backed config table,
 * and the previous platform_config setup meant a real drift risk: values
 * were seeded into the DB from lib/pricing-config.ts, but several call
 * sites (price-change moderation bands, in particular) never actually read
 * the DB and instead hardcoded their own copies of the same numbers —
 * three independent copies of the "5%" band threshold existed. Collapsing
 * to a single static JSON file removes that class of bug: there's exactly
 * one file to edit, and every consumer reads through the same ConfigStore
 * interface as before.
 *
 * Trade-off, made deliberately: changing a commission rate or ranking
 * weight now requires a code deploy, the same as every other config file
 * in config/*.json. Previously a DB row could be edited without a deploy.
 * If per-tenant or same-day-editable pricing becomes a real need, this is
 * the file to point a future admin system at.
 */

import { InMemoryConfigStore, type ConfigStore } from '@/lib/domain/config'
import platformConfig from '@/config/platform-config.json'

function flattenPlatformConfig(): Record<string, unknown> {
  const c = platformConfig
  const flat: Record<string, unknown> = {}

  c.commission.brackets.forEach((b, i) => {
    flat[`commission_rate_bracket_${i + 1}`] = b.rate
    if (i < c.commission.brackets.length - 1) {
      flat[`commission_bracket_${i + 1}_max`] = b.max
    }
  })
  flat.commission_stacking_floor = c.commission.stackingFloor

  flat.price_change_band_1_max_pct = c.priceChangeBands.band1MaxPct
  flat.price_change_band_2_max_pct = c.priceChangeBands.band2MaxPct
  flat.price_change_band_3_max_pct = c.priceChangeBands.band3MaxPct
  flat.price_change_band_4_max_pct = c.priceChangeBands.band4MaxPct
  flat.price_change_high_demand_threshold = c.priceChangeBands.highDemandThreshold

  // Ceiling packages are packages 2-5 (index 1-4) — package 1 (Starter) has
  // no ceiling/bonus, matching the pre-existing ceiling_rate_10/95/85/75 key
  // naming (suffix = ceiling rate × 1000, e.g. 0.10 -> "10").
  const ceilingSuffixes: Record<number, string> = { 2: '10', 3: '95', 4: '85', 5: '75' }
  for (const pkg of c.packages) {
    const suffix = ceilingSuffixes[pkg.packageNumber]
    if (!suffix) continue
    if (pkg.ceilingRate !== null) flat[`ceiling_rate_${suffix}`] = pkg.ceilingRate
    if (pkg.d4dBonus !== null) flat[`discount_bonus_${suffix}`] = pkg.d4dBonus
  }
  for (const pkg of c.packages) {
    flat[`temp_reduction_pkg_${pkg.packageNumber}`] = pkg.tempReduction.points
    flat[`temp_reduction_pkg_${pkg.packageNumber}_months`] = pkg.tempReduction.months
  }

  flat.ranking_weight_text_match = c.ranking.weightTextMatch
  flat.ranking_weight_location = c.ranking.weightLocation
  flat.ranking_weight_tags = c.ranking.weightTags
  flat.ranking_weight_review_quality = c.ranking.weightReviewQuality
  flat.ranking_weight_completed_bookings = c.ranking.weightCompletedBookings
  flat.ranking_weight_profile_completeness = c.ranking.weightProfileCompleteness
  flat.ranking_weight_reliability_penalty = c.ranking.weightReliabilityPenalty

  flat.min_reviews_for_recommendation = c.serviceRecommendation.minReviewsForRecommendation
  flat.recommendation_weight_recency_rating = c.serviceRecommendation.weightRecencyRating
  flat.recommendation_weight_booking_volume = c.serviceRecommendation.weightBookingVolume
  flat.recommendation_weight_reliability = c.serviceRecommendation.weightReliability
  flat.recommendation_weight_review_ratio = c.serviceRecommendation.weightReviewRatio
  flat.recommendation_recency_half_life_days = c.serviceRecommendation.recencyHalfLifeDays

  flat.booking_auto_expiry_hours = c.booking.autoExpiryHours

  flat.credit_pack_denominations = JSON.stringify(c.creditWallet.packDenominations)
  flat.credit_purchase_min = c.creditWallet.purchaseMinCredits
  flat.credit_purchase_max = c.creditWallet.purchaseMaxCredits

  flat.provider_payout_business_days = c.providerPayout.businessDays
  flat.support_email = c.support.email

  return flat
}

let cachedStore: ConfigStore | null = null

/**
 * Returns the JSON-backed ConfigStore. Synchronous under the hood (static
 * import, no I/O) but kept async to match the old loadConfigStore(supabase)
 * signature at every call site — no caller needs to change beyond dropping
 * the supabase argument.
 */
export async function loadPlatformConfig(): Promise<ConfigStore> {
  if (!cachedStore) {
    cachedStore = new InMemoryConfigStore(flattenPlatformConfig())
  }
  return cachedStore
}

export { platformConfig }

/**
 * Referral agent programme terms. No commission-calculation code reads this
 * yet (the programme is currently display-copy-only, applied via email per
 * the referral-agents page) — this is the single source of truth for the
 * numbers shown there, so if/when payout calculation is built, it reads
 * from here rather than a third independent copy.
 */
export const REFERRAL_PROGRAM = {
  commissionPct: platformConfig.referralProgram.commissionPct,
  maxActiveMonths: platformConfig.referralProgram.maxActiveMonths,
}

/**
 * Max upload file size (MB). Single source for lib/actions/upload.ts's
 * server-side check and the storage bucket's own file_size_limit
 * (supabase/migrations/20260622000000_provider_assets_bucket.sql and
 * 20260811100000_contact_verification.sql — both DB-level limits, edit
 * those migrations to match if this number changes) and the four
 * component display-copy strings that previously repeated "10 MB"
 * independently (PortfolioStep, GalleryUploadField, ServiceImageUpload,
 * ImageUploadField).
 */
export const MAX_UPLOAD_FILE_SIZE_MB = platformConfig.upload.maxFileSizeMb

/** Direct-value accessor for callers that don't need the full ConfigStore round trip — see lib/domain/payments.ts's PriceChangeBands. */
export const PRICE_CHANGE_BANDS = {
  band1MaxPct: platformConfig.priceChangeBands.band1MaxPct,
  band2MaxPct: platformConfig.priceChangeBands.band2MaxPct,
  band3MaxPct: platformConfig.priceChangeBands.band3MaxPct,
  band4MaxPct: platformConfig.priceChangeBands.band4MaxPct,
  highDemandThreshold: platformConfig.priceChangeBands.highDemandThreshold,
}
