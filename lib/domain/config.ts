// Stub config reader — reads from platform_config table via an injected adapter.
// All BUSINESS DECISION REQUIRED values are consumed through this interface
// (ARCH-007), never hardcoded in domain logic.

export interface ConfigStore {
  get(key: string): Promise<unknown>;
}

// In-memory config store for unit tests.
export class InMemoryConfigStore implements ConfigStore {
  private data: Map<string, unknown>;

  constructor(entries: Record<string, unknown> = {}) {
    this.data = new Map(Object.entries(entries));
  }

  async get(key: string): Promise<unknown> {
    if (!this.data.has(key)) {
      throw new Error(`Config key not found: ${key}`);
    }
    return this.data.get(key);
  }

  set(key: string, value: unknown): void {
    this.data.set(key, value);
  }
}

export async function getConfigNumber(
  store: ConfigStore,
  key: string,
): Promise<number> {
  const raw = await store.get(key);
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new Error(`Config key "${key}" must be a finite number, got: ${raw}`);
  }
  return n;
}

export async function getConfigString(
  store: ConfigStore,
  key: string,
): Promise<string> {
  const raw = await store.get(key);
  if (typeof raw !== "string") {
    throw new Error(`Config key "${key}" must be a string, got: ${typeof raw}`);
  }
  return raw;
}

// Well-known config keys — centralised here so all domain modules import from
// one place instead of spreading magic strings across files.
//
// Backing values live in config/platform-config.json (see lib/platform-config.ts),
// not a DB table — there is no tenant-admin system yet to justify one, and a
// DB table plus a TS constant plus a JSON seed was three sources of truth
// for the same numbers. Changing a value here means editing that JSON file
// and deploying.
//
// Dead keys removed (zero real call sites, confirmed by repo-wide grep
// before removal): COMMISSION_RATE (legacy single-rate key, superseded by
// the bracket keys), PROVIDER_SUBSCRIPTION_FEE and CEILING_FEE_10/95/85/75
// (package fees are read from lib/pricing-config.ts's PACKAGES directly,
// never from config — these were seeded but never consumed).
export const CONFIG_KEYS = {
  // Booking
  BOOKING_AUTO_EXPIRY_HOURS: "booking_auto_expiry_hours",

  // Ranking
  RANKING_WEIGHT_TEXT_MATCH: "ranking_weight_text_match",
  RANKING_WEIGHT_LOCATION: "ranking_weight_location",
  RANKING_WEIGHT_TAGS: "ranking_weight_tags",
  RANKING_WEIGHT_REVIEW_QUALITY: "ranking_weight_review_quality",
  RANKING_WEIGHT_COMPLETED_BOOKINGS: "ranking_weight_completed_bookings",
  RANKING_WEIGHT_PROFILE_COMPLETENESS: "ranking_weight_profile_completeness",
  RANKING_WEIGHT_RELIABILITY_PENALTY: "ranking_weight_reliability_penalty",

  // Service recommendation ranking — folded in from a previously separate,
  // undeclared key map in lib/domain/service-ranking.ts.
  MIN_REVIEWS_FOR_RECOMMENDATION: "min_reviews_for_recommendation",
  RECOMMENDATION_WEIGHT_RECENCY_RATING: "recommendation_weight_recency_rating",
  RECOMMENDATION_WEIGHT_BOOKING_VOLUME: "recommendation_weight_booking_volume",
  RECOMMENDATION_WEIGHT_RELIABILITY: "recommendation_weight_reliability",
  RECOMMENDATION_WEIGHT_REVIEW_RATIO: "recommendation_weight_review_ratio",
  RECOMMENDATION_RECENCY_HALF_LIFE_DAYS: "recommendation_recency_half_life_days",

  // Commission brackets (Section 2 of pricing source doc)
  COMMISSION_RATE_BRACKET_1: "commission_rate_bracket_1",  // 0.075
  COMMISSION_RATE_BRACKET_2: "commission_rate_bracket_2",  // 0.085
  COMMISSION_RATE_BRACKET_3: "commission_rate_bracket_3",  // 0.095
  COMMISSION_RATE_BRACKET_4: "commission_rate_bracket_4",  // 0.10
  COMMISSION_RATE_BRACKET_5: "commission_rate_bracket_5",  // 0.1275
  COMMISSION_BRACKET_1_MAX: "commission_bracket_1_max",    // 999
  COMMISSION_BRACKET_2_MAX: "commission_bracket_2_max",    // 4999
  COMMISSION_BRACKET_3_MAX: "commission_bracket_3_max",    // 9999
  COMMISSION_BRACKET_4_MAX: "commission_bracket_4_max",    // 49999

  // Ceiling package rates (Section 3)
  CEILING_RATE_10: "ceiling_rate_10",   // 0.10
  CEILING_RATE_95: "ceiling_rate_95",   // 0.095
  CEILING_RATE_85: "ceiling_rate_85",   // 0.085
  CEILING_RATE_75: "ceiling_rate_75",   // 0.075

  // Discount-unlock bonus (Section 4) — in rate points, e.g. 0.025
  DISCOUNT_BONUS_10: "discount_bonus_10",  // 0.025
  DISCOUNT_BONUS_95: "discount_bonus_95",  // 0.030
  DISCOUNT_BONUS_85: "discount_bonus_85",  // 0.035
  DISCOUNT_BONUS_75: "discount_bonus_75",  // 0.045

  // Price-change moderation (Section 5) — now actually read by
  // evaluatePriceChange/checkDiscountEligibility (previously seeded but
  // never consumed; those functions hardcoded their own copies instead).
  PRICE_CHANGE_BAND_1_MAX_PCT: "price_change_band_1_max_pct",  // 5.0
  PRICE_CHANGE_BAND_2_MAX_PCT: "price_change_band_2_max_pct",  // 9.5 (exclusive lower of band 3)
  PRICE_CHANGE_BAND_3_MAX_PCT: "price_change_band_3_max_pct",  // 25.0
  PRICE_CHANGE_BAND_4_MAX_PCT: "price_change_band_4_max_pct",  // 50.0
  PRICE_CHANGE_HIGH_DEMAND_THRESHOLD: "price_change_high_demand_threshold",  // 3

  // Stacking floor (perks matrix, Section 1)
  // Minimum effective commission rate after all discount layers are applied.
  // Confirmed value: 4% (0.04) — protects margin above payment-processing costs.
  COMMISSION_STACKING_FLOOR: "commission_stacking_floor",  // 0.04

  // Temporary commission-reduction add-ons (perks matrix, Section 2)
  // One per package. Amounts in rate points (e.g. 0.010 = 1.0pt).
  // Duration in calendar months.
  TEMP_REDUCTION_PKG_1: "temp_reduction_pkg_1",               // 0.010 (−1.0pt)
  TEMP_REDUCTION_PKG_2: "temp_reduction_pkg_2",               // 0.016 (−1.6pt)
  TEMP_REDUCTION_PKG_3: "temp_reduction_pkg_3",               // 0.020 (−2.0pt)
  TEMP_REDUCTION_PKG_4: "temp_reduction_pkg_4",               // 0.030 (−3.0pt)
  TEMP_REDUCTION_PKG_5: "temp_reduction_pkg_5",               // 0.035 (−3.5pt)
  TEMP_REDUCTION_PKG_1_MONTHS: "temp_reduction_pkg_1_months", // 3
  TEMP_REDUCTION_PKG_2_MONTHS: "temp_reduction_pkg_2_months", // 3
  TEMP_REDUCTION_PKG_3_MONTHS: "temp_reduction_pkg_3_months", // 3
  TEMP_REDUCTION_PKG_4_MONTHS: "temp_reduction_pkg_4_months", // 3
  TEMP_REDUCTION_PKG_5_MONTHS: "temp_reduction_pkg_5_months", // 6

  // Credit wallet
  CREDIT_PACK_DENOMINATIONS: "credit_pack_denominations",
  CREDIT_PURCHASE_MIN: "credit_purchase_min",
  CREDIT_PURCHASE_MAX: "credit_purchase_max",
  PROVIDER_PAYOUT_BUSINESS_DAYS: "provider_payout_business_days",
  PROVIDER_PAYOUT_MINIMUM_REQUEST_AMOUNT: "provider_payout_minimum_request_amount",
  SUPPORT_EMAIL: "support_email",
} as const;
