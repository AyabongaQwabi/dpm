/**
 * SINGLE SOURCE OF TRUTH — provider pricing configuration.
 *
 * The actual data lives in config/platform-config.json now, not in this
 * file — commission brackets, package numbers/fees/rates, and marketing
 * copy (name/badge/tagline/planDetail/savingExample) are all read from
 * there. This file's job is now: re-shape that JSON into the typed
 * constants/helpers every consumer already imports (COMMISSION_BRACKETS,
 * PACKAGES, effectiveRate, formatRate, etc.), so none of those call sites
 * (CommissionCalculator.tsx, the pricing page, subscription actions, ~12
 * files in total) need to change.
 *
 * There is no DB round-trip anywhere in this file or its consumers — the
 * old platform_config table and the DB-backed ConfigStore path are gone;
 * see lib/platform-config.ts for the JSON-backed ConfigStore used by
 * server domain functions (payments.ts, ranking.ts, etc.).
 *
 * To change any rate, fee, cap, or marketing copy string: edit
 * config/platform-config.json. A deploy is required to pick it up.
 */

import platformConfig from '../config/platform-config.json'

// ─── Commission brackets ──────────────────────────────────────────────────────

export interface CommissionBracketDef {
  min: number;
  max: number;
  rate: number;
  label: string;
}

/**
 * The five per-sale commission brackets, re-shaped from
 * config/platform-config.json's commission.brackets (JSON can't represent
 * Infinity, so the last bracket's null max is mapped to Infinity here —
 * same meaning as before: "everything above the previous max").
 */
export const COMMISSION_BRACKETS: readonly CommissionBracketDef[] = platformConfig.commission.brackets.map((b) => ({
  min: b.min,
  max: b.max ?? Infinity,
  rate: b.rate,
  label: b.label,
}));

/** Lowest possible commission rate (bracket 1). Useful for display copy. */
export const MIN_COMMISSION_RATE = COMMISSION_BRACKETS[0].rate; // 0.075

/** Highest possible commission rate (bracket 5). Useful for display copy. */
export const MAX_COMMISSION_RATE = COMMISSION_BRACKETS[COMMISSION_BRACKETS.length - 1].rate; // 0.1275

// ─── Commission floor ─────────────────────────────────────────────────────────

/**
 * Stacking floor: the effective commission rate can never drop below this,
 * regardless of how many savings layers (ceiling + D4D bonus + temp reduction)
 * are active simultaneously.
 */
export const COMMISSION_STACKING_FLOOR = platformConfig.commission.stackingFloor;

// ─── Packages ─────────────────────────────────────────────────────────────────

/**
 * Every provider plan. The `id` is the stable identifier used throughout the
 * codebase (package_number in the DB is 1–5 matching the array index + 1).
 *
 * Fields:
 *   packageNumber   — DB integer (1–5). Never reassign existing numbers.
 *   id              — Stable string key for code references.
 *   name            — Marketing display name.
 *   monthlyFee      — Subscription fee in Rands (integer).
 *   ceilingRate     — Max commission rate, or null for base plan (no cap).
 *   d4dBonus        — Discount 4 Discount bonus in rate-points (e.g. 0.025 = 2.5%).
 *                     null for base plan (bonus not available).
 *   tempReduction   — Time-limited rate reduction that can be granted as a perk.
 *   badge           — Card badge label, or null.
 *   recommended     — Whether this plan is highlighted as "most popular".
 *   tagline         — One-line selling tagline for the plan card.
 *   planDetail      — One-paragraph description used in the plan card body.
 *   savingExample   — Concrete saving example shown in the plan card callout,
 *                     or null for base plan. Derived dynamically where possible
 *                     but stored here so the pricing page stays static-renderable.
 */
export interface PackageConfig {
  packageNumber: 1 | 2 | 3 | 4 | 5;
  id: string;
  name: string;
  monthlyFee: number;
  ceilingRate: number | null;
  d4dBonus: number | null;
  tempReduction: {
    /** Rate-point reduction, e.g. 0.010 = 1.0 percentage point */
    points: number;
    /** Duration in calendar months */
    months: number;
  };
  badge: string | null;
  recommended: boolean;
  tagline: string;
  planDetail: string;
  savingExample: string | null;
}

/**
 * Every provider plan, re-shaped from config/platform-config.json's
 * packages array (numeric fields, caps, AND marketing copy — name, badge,
 * tagline, planDetail, savingExample — all live there now).
 */
export const PACKAGES: readonly PackageConfig[] = platformConfig.packages.map((p) => ({
  packageNumber: p.packageNumber as 1 | 2 | 3 | 4 | 5,
  id: p.id,
  name: p.name,
  monthlyFee: p.monthlyFee,
  ceilingRate: p.ceilingRate,
  d4dBonus: p.d4dBonus,
  tempReduction: p.tempReduction,
  badge: p.badge,
  recommended: p.recommended,
  tagline: p.tagline,
  planDetail: p.planDetail,
  savingExample: p.savingExample,
}));

// ─── Derived helpers (pure functions, no imports, safe to use anywhere) ───────

/** Return the package config for a given package number (1–5). */
export function getPackage(packageNumber: 1 | 2 | 3 | 4 | 5): PackageConfig {
  const pkg = PACKAGES.find(p => p.packageNumber === packageNumber);
  if (!pkg) throw new Error(`Unknown package number: ${packageNumber}`);
  return pkg;
}

/** Return the package config for a given string id. */
export function getPackageById(id: string): PackageConfig {
  const pkg = PACKAGES.find(p => p.id === id);
  if (!pkg) throw new Error(`Unknown package id: ${id}`);
  return pkg;
}

/** Find the commission bracket for a given sale price. */
export function findBracket(price: number): CommissionBracketDef {
  return (
    COMMISSION_BRACKETS.find(b => price >= b.min && price <= b.max) ??
    COMMISSION_BRACKETS[COMMISSION_BRACKETS.length - 1]
  );
}

/**
 * Calculate the effective commission rate for a sale.
 *
 * @param price         Sale price in Rands.
 * @param ceilingRate   The package's ceiling rate, or null for no cap.
 * @returns             Effective rate as a decimal (e.g. 0.095 = 9.5%).
 */
export function effectiveRate(price: number, ceilingRate: number | null): number {
  const bracket = findBracket(price);
  return ceilingRate !== null ? Math.min(bracket.rate, ceilingRate) : bracket.rate;
}

/**
 * Calculate D4D (Discount 4 Discount) effective rate after the bonus.
 * The bonus reduces the ceiling rate further, floored by COMMISSION_STACKING_FLOOR.
 *
 * @param ceilingRate   Package ceiling rate (must not be null — D4D requires a ceiling).
 * @param d4dBonus      Bonus in rate-points (e.g. 0.025).
 * @returns             Effective rate after bonus, >= COMMISSION_STACKING_FLOOR.
 */
export function d4dEffectiveRate(ceilingRate: number, d4dBonus: number): number {
  return Math.max(COMMISSION_STACKING_FLOOR, ceilingRate - d4dBonus);
}

/**
 * Human-readable formatted percentage string (e.g. 0.075 → "7.5%").
 * Strips trailing ".0" (e.g. 0.10 → "10%" not "10.0%").
 */
export function formatRate(rate: number): string {
  return (rate * 100).toFixed(2).replace(/\.?0+$/, '') + '%';
}

/**
 * Human-readable formatted Rand amount (e.g. 1199 → "R1,199").
 */
export function formatFee(amount: number): string {
  return 'R' + amount.toLocaleString('en-ZA');
}

// ─── Flat key→value map (used by test fixtures via makePricingConfigStore) ────

/**
 * The same flat key→value shape lib/domain/config.ts's CONFIG_KEYS expects,
 * generated from config/platform-config.json. Used only by test fixtures
 * (makePricingConfigStore, below) — production code reads through
 * lib/platform-config.ts's loadPlatformConfig() instead, which is generated
 * from the same JSON via a separate flattening function. Kept as two
 * independent flatteners rather than one shared function so lib/pricing-config.ts
 * (imported by client components) never needs to import lib/domain/config.ts's
 * ConfigStore machinery.
 *
 * The old "commission_rate" legacy single-rate key was removed — zero call
 * sites read it (confirmed by repo-wide grep before removal); it was
 * superseded by the per-bracket keys below.
 */
export const PLATFORM_CONFIG_SEED: Record<string, string> = {
  // Bracket rates
  commission_rate_bracket_1: String(COMMISSION_BRACKETS[0].rate),
  commission_rate_bracket_2: String(COMMISSION_BRACKETS[1].rate),
  commission_rate_bracket_3: String(COMMISSION_BRACKETS[2].rate),
  commission_rate_bracket_4: String(COMMISSION_BRACKETS[3].rate),
  commission_rate_bracket_5: String(COMMISSION_BRACKETS[4].rate),

  // Bracket boundaries (upper-inclusive per bracket)
  commission_bracket_1_max: String(COMMISSION_BRACKETS[0].max),
  commission_bracket_2_max: String(COMMISSION_BRACKETS[1].max),
  commission_bracket_3_max: String(COMMISSION_BRACKETS[2].max),
  commission_bracket_4_max: String(COMMISSION_BRACKETS[3].max),
  // Bracket 5 has no max — the domain uses the absence of a higher bracket

  // Stacking floor
  commission_stacking_floor: String(COMMISSION_STACKING_FLOOR),

  // Ceiling package rates (ceiling plans only — packages 2–5)
  ceiling_rate_10: String(PACKAGES[1].ceilingRate),
  ceiling_rate_95: String(PACKAGES[2].ceilingRate),
  ceiling_rate_85: String(PACKAGES[3].ceilingRate),
  ceiling_rate_75: String(PACKAGES[4].ceilingRate),

  // Discount 4 Discount bonus rate-points per ceiling package
  discount_bonus_10: String(PACKAGES[1].d4dBonus),
  discount_bonus_95: String(PACKAGES[2].d4dBonus),
  discount_bonus_85: String(PACKAGES[3].d4dBonus),
  discount_bonus_75: String(PACKAGES[4].d4dBonus),

  // Temporary commission reductions per package (all 5)
  temp_reduction_pkg_1: String(PACKAGES[0].tempReduction.points),
  temp_reduction_pkg_2: String(PACKAGES[1].tempReduction.points),
  temp_reduction_pkg_3: String(PACKAGES[2].tempReduction.points),
  temp_reduction_pkg_4: String(PACKAGES[3].tempReduction.points),
  temp_reduction_pkg_5: String(PACKAGES[4].tempReduction.points),

  temp_reduction_pkg_1_months: String(PACKAGES[0].tempReduction.months),
  temp_reduction_pkg_2_months: String(PACKAGES[1].tempReduction.months),
  temp_reduction_pkg_3_months: String(PACKAGES[2].tempReduction.months),
  temp_reduction_pkg_4_months: String(PACKAGES[3].tempReduction.months),
  temp_reduction_pkg_5_months: String(PACKAGES[4].tempReduction.months),

  // Price-change moderation bands
  price_change_band_1_max_pct: String(platformConfig.priceChangeBands.band1MaxPct),
  price_change_band_2_max_pct: String(platformConfig.priceChangeBands.band2MaxPct),
  price_change_band_3_max_pct: String(platformConfig.priceChangeBands.band3MaxPct),
  price_change_band_4_max_pct: String(platformConfig.priceChangeBands.band4MaxPct),
  price_change_high_demand_threshold: String(platformConfig.priceChangeBands.highDemandThreshold),

  // Booking auto-expiry
  booking_auto_expiry_hours: String(platformConfig.booking.autoExpiryHours),

  // Credit wallet (1 credit = R1)
  credit_pack_denominations: JSON.stringify(platformConfig.creditWallet.packDenominations),
  credit_purchase_min: String(platformConfig.creditWallet.purchaseMinCredits),
  credit_purchase_max: String(platformConfig.creditWallet.purchaseMaxCredits),
  provider_payout_business_days: String(platformConfig.providerPayout.businessDays),
  support_email: platformConfig.support.email,

  // Ranking weights
  ranking_weight_text_match: String(platformConfig.ranking.weightTextMatch),
  ranking_weight_location: String(platformConfig.ranking.weightLocation),
  ranking_weight_tags: String(platformConfig.ranking.weightTags),
  ranking_weight_review_quality: String(platformConfig.ranking.weightReviewQuality),
  ranking_weight_completed_bookings: String(platformConfig.ranking.weightCompletedBookings),
  ranking_weight_profile_completeness: String(platformConfig.ranking.weightProfileCompleteness),
  ranking_weight_reliability_penalty: String(platformConfig.ranking.weightReliabilityPenalty),

  // Service recommendation ranking (formerly a separate shadow key registry
  // in lib/domain/service-ranking.ts, folded into the canonical CONFIG_KEYS)
  min_reviews_for_recommendation: String(platformConfig.serviceRecommendation.minReviewsForRecommendation),
  recommendation_weight_recency_rating: String(platformConfig.serviceRecommendation.weightRecencyRating),
  recommendation_weight_booking_volume: String(platformConfig.serviceRecommendation.weightBookingVolume),
  recommendation_weight_reliability: String(platformConfig.serviceRecommendation.weightReliability),
  recommendation_weight_review_ratio: String(platformConfig.serviceRecommendation.weightReviewRatio),
  recommendation_recency_half_life_days: String(platformConfig.serviceRecommendation.recencyHalfLifeDays),
};

/**
 * Build an InMemoryConfigStore pre-populated from PLATFORM_CONFIG_SEED.
 * Import this in test files instead of hand-writing fixtures:
 *
 *   import { makePricingConfigStore } from '@/lib/pricing-config'
 *   const config = makePricingConfigStore()
 *
 * This is the only place test fixtures should be created — so changing a rate
 * here automatically updates all tests.
 *
 * NOTE: This function imports from lib/domain/config.ts. It is intentionally
 * in this file (not in a test helper) so that non-test code (e.g. a seeder
 * script) can also call it without pulling in test dependencies.
 */
export async function makePricingConfigStore() {
  const { InMemoryConfigStore } = await import('./domain/config');
  return new InMemoryConfigStore(PLATFORM_CONFIG_SEED);
}
