// Payment domain logic — commission brackets, ceiling packages, discount-unlock
// bonus, stacking floor, and temporary commission-reduction add-ons.
//
// Source of truth:
//   docs/docs/dpm_pricing_model_source_of_truth.docx
//   docs/docs/dpm_package_perks_matrix.docx
//
// All bracket boundaries, rates, and fee amounts are read from ConfigStore
// (platform_config table) — nothing is hardcoded.

import { ConfigStore, getConfigNumber, CONFIG_KEYS } from "./config";

// ---------- Types ----------

export type DiscountType = "amount" | "percent" | "none";

export interface ServicePricing {
  price: number;           // list price (pre-discount)
  discountType: DiscountType;
  discountAmount: number | null;
}

export interface CommissionResult {
  finalPrice: number;
  commissionAmount: number;
  providerPayoutAmount: number;
  commissionRate: number;  // effective rate applied (after ceiling + bonus + floor)
  standardRate: number;    // bracket rate before ceiling/bonus (for audit)
}

// ---------- Discount application ----------
// PAY-LOGIC-002: commission is always on post-discount price.

export function applyDiscount(pricing: ServicePricing): number {
  const { price, discountType, discountAmount } = pricing;

  if (discountType === "none" || discountAmount === null) return price;

  if (discountType === "amount") {
    const finalPrice = price - discountAmount;
    if (finalPrice < 0) {
      throw new RangeError(
        `Discount amount (${discountAmount}) exceeds service price (${price}).`,
      );
    }
    return finalPrice;
  }

  if (discountType === "percent") {
    if (discountAmount < 0 || discountAmount > 100) {
      throw new RangeError(
        `Discount percent must be between 0 and 100, got ${discountAmount}.`,
      );
    }
    return price * (1 - discountAmount / 100);
  }

  throw new Error(`Unknown discount type: ${discountType}`);
}

// ---------- Bracket commission (Section 2) ----------
//
// Five brackets, each independently evaluated per sale.
// Bracket boundaries and rates all come from config.

export interface CommissionBracket {
  minPrice: number;   // inclusive
  maxPrice: number;   // inclusive (use Infinity for the top bracket)
  rate: number;       // decimal, e.g. 0.075
}

export async function getCommissionBrackets(
  config: ConfigStore,
): Promise<CommissionBracket[]> {
  const [r1, r2, r3, r4, r5, b1, b2, b3, b4] = await Promise.all([
    getConfigNumber(config, CONFIG_KEYS.COMMISSION_RATE_BRACKET_1),
    getConfigNumber(config, CONFIG_KEYS.COMMISSION_RATE_BRACKET_2),
    getConfigNumber(config, CONFIG_KEYS.COMMISSION_RATE_BRACKET_3),
    getConfigNumber(config, CONFIG_KEYS.COMMISSION_RATE_BRACKET_4),
    getConfigNumber(config, CONFIG_KEYS.COMMISSION_RATE_BRACKET_5),
    getConfigNumber(config, CONFIG_KEYS.COMMISSION_BRACKET_1_MAX),
    getConfigNumber(config, CONFIG_KEYS.COMMISSION_BRACKET_2_MAX),
    getConfigNumber(config, CONFIG_KEYS.COMMISSION_BRACKET_3_MAX),
    getConfigNumber(config, CONFIG_KEYS.COMMISSION_BRACKET_4_MAX),
  ]);
  return [
    { minPrice: 0,      maxPrice: b1,       rate: r1 },
    { minPrice: b1 + 1, maxPrice: b2,       rate: r2 },
    { minPrice: b2 + 1, maxPrice: b3,       rate: r3 },
    { minPrice: b3 + 1, maxPrice: b4,       rate: r4 },
    { minPrice: b4 + 1, maxPrice: Infinity,  rate: r5 },
  ];
}

export function selectBracket(
  finalPrice: number,
  brackets: CommissionBracket[],
): CommissionBracket {
  const bracket = brackets.find(
    (b) => finalPrice >= b.minPrice && finalPrice <= b.maxPrice,
  );
  if (!bracket) {
    throw new RangeError(`No commission bracket found for price ${finalPrice}`);
  }
  return bracket;
}

// ---------- Ceiling package (Section 3) ----------
//
// effectiveRate = min(standardBracketRate, ceilingRate ?? Infinity)
// A ceiling can never RAISE the rate — it can only lower or leave it unchanged.

export function applyCeiling(
  standardRate: number,
  ceilingRate: number | null,
): number {
  if (ceilingRate === null) return standardRate;
  return Math.min(standardRate, ceilingRate);
}

// ---------- Discount-unlock bonus (Section 4) ----------
//
// Only for ceiling-package providers. Only when discount is EXACTLY 10%.
// Only when discount-eligibility verification passes (separate check).
// Bonus reduces the ceiling rate by a fixed number of percentage points per tier.

export interface DiscountBonusResult {
  bonusApplies: boolean;
  effectiveRate: number;  // rate after bonus subtracted (floor NOT yet applied here)
  bonusPoints: number;    // pts subtracted from ceiling rate (0 if no bonus)
}

export async function applyDiscountBonus(
  baseRate: number,         // rate after ceiling (or standard rate if no ceiling)
  ceilingRate: number | null,
  discountPercent: number | null,   // null if discount is not 'percent' type
  isEligibleForBonus: boolean,      // must pass verification (Section 5)
  config: ConfigStore,
): Promise<DiscountBonusResult> {
  // No ceiling package → no bonus
  if (ceilingRate === null) {
    return { bonusApplies: false, effectiveRate: baseRate, bonusPoints: 0 };
  }

  // Discount must be exactly 10%
  if (discountPercent === null || Math.abs(discountPercent - 10) > 0.0001) {
    return { bonusApplies: false, effectiveRate: baseRate, bonusPoints: 0 };
  }

  if (!isEligibleForBonus) {
    return { bonusApplies: false, effectiveRate: baseRate, bonusPoints: 0 };
  }

  // Look up the bonus for this ceiling tier.
  // NOTE: floor is NOT applied inside this function — it is applied once after
  // ALL discount layers are accumulated, in calculateCommissionFull.
  const bonus = await getBonusForCeilingRate(ceilingRate, config);
  const effectiveRate = baseRate - bonus;
  return { bonusApplies: true, effectiveRate, bonusPoints: bonus };
}

async function getBonusForCeilingRate(
  ceilingRate: number,
  config: ConfigStore,
): Promise<number> {
  const [c10, c95, c85, c75, b10, b95, b85, b75] = await Promise.all([
    getConfigNumber(config, CONFIG_KEYS.CEILING_RATE_10),
    getConfigNumber(config, CONFIG_KEYS.CEILING_RATE_95),
    getConfigNumber(config, CONFIG_KEYS.CEILING_RATE_85),
    getConfigNumber(config, CONFIG_KEYS.CEILING_RATE_75),
    getConfigNumber(config, CONFIG_KEYS.DISCOUNT_BONUS_10),
    getConfigNumber(config, CONFIG_KEYS.DISCOUNT_BONUS_95),
    getConfigNumber(config, CONFIG_KEYS.DISCOUNT_BONUS_85),
    getConfigNumber(config, CONFIG_KEYS.DISCOUNT_BONUS_75),
  ]);

  const bonusMap: Array<[number, number]> = [
    [c10, b10],
    [c95, b95],
    [c85, b85],
    [c75, b75],
  ];

  for (const [rate, bonus] of bonusMap) {
    if (Math.abs(ceilingRate - rate) < 0.0001) return bonus;
  }

  // Unknown ceiling rate — no bonus
  return 0;
}

// ---------- Temporary commission-reduction add-on (perks matrix, Section 2) ----------
//
// Time-bounded reduction granted per package tier. Active while the grant record
// has active_until > now(). Stacks on top of ceiling + discount-unlock bonus;
// the floor is applied AFTER this reduction, same as all other layers.
//
// The "package number" (1–5) maps as follows:
//   Package 1 = base R99, no ceiling
//   Package 2 = 10% ceiling (R499/mo)
//   Package 3 = 9.5% ceiling (R799/mo)
//   Package 4 = 8.5% ceiling (R1,199/mo)
//   Package 5 = 7.5% ceiling (R1,699/mo)

export async function getTemporaryReductionAmount(
  packageNumber: 1 | 2 | 3 | 4 | 5,
  config: ConfigStore,
): Promise<number> {
  const keyMap: Record<number, string> = {
    1: CONFIG_KEYS.TEMP_REDUCTION_PKG_1,
    2: CONFIG_KEYS.TEMP_REDUCTION_PKG_2,
    3: CONFIG_KEYS.TEMP_REDUCTION_PKG_3,
    4: CONFIG_KEYS.TEMP_REDUCTION_PKG_4,
    5: CONFIG_KEYS.TEMP_REDUCTION_PKG_5,
  };
  return getConfigNumber(config, keyMap[packageNumber]);
}

export async function getTemporaryReductionMonths(
  packageNumber: 1 | 2 | 3 | 4 | 5,
  config: ConfigStore,
): Promise<number> {
  const keyMap: Record<number, string> = {
    1: CONFIG_KEYS.TEMP_REDUCTION_PKG_1_MONTHS,
    2: CONFIG_KEYS.TEMP_REDUCTION_PKG_2_MONTHS,
    3: CONFIG_KEYS.TEMP_REDUCTION_PKG_3_MONTHS,
    4: CONFIG_KEYS.TEMP_REDUCTION_PKG_4_MONTHS,
    5: CONFIG_KEYS.TEMP_REDUCTION_PKG_5_MONTHS,
  };
  return getConfigNumber(config, keyMap[packageNumber]);
}

// ---------- Stacking floor (perks matrix, Section 1) ----------
//
// Applied ONCE after every discount layer has been subtracted.
// effective_rate = max(floor, raw_rate_after_all_reductions)
//
// This is the single enforcement point — not applied inside individual
// layer functions so the floor is never accidentally double-applied or missed.

export async function applyStackingFloor(
  rawRate: number,
  config: ConfigStore,
): Promise<number> {
  const floor = await getConfigNumber(config, CONFIG_KEYS.COMMISSION_STACKING_FLOOR);
  return Math.max(floor, rawRate);
}

// ---------- Full commission calculation ----------

export interface FullCommissionInput {
  pricing: ServicePricing;
  ceilingRate: number | null;           // provider's ceiling package rate, or null
  discountBonusEligible: boolean;       // passed verification (Section 5)
  discountBonusOptedIn: boolean;        // provider actively accepted the bonus
  // Active temporary reduction, already retrieved from DB and time-checked by caller.
  // Pass null if no active grant exists.
  activeTemporaryReduction?: number | null;  // rate points, e.g. 0.035 for −3.5pt
}

export interface FullCommissionResult extends CommissionResult {
  bonusApplied: boolean;
  bonusPoints: number;
  temporaryReductionApplied: boolean;
  temporaryReductionPoints: number;
  floorApplied: boolean;  // true when the floor clamped the rate up
}

export async function calculateCommissionFull(
  input: FullCommissionInput,
  config: ConfigStore,
): Promise<FullCommissionResult> {
  const finalPrice = round2dp(applyDiscount(input.pricing));

  const brackets = await getCommissionBrackets(config);
  const bracket = selectBracket(finalPrice, brackets);
  const standardRate = bracket.rate;

  // Layer 1: ceiling
  const rateAfterCeiling = applyCeiling(standardRate, input.ceilingRate);

  // Layer 2: discount-unlock bonus
  const discountPercent =
    input.pricing.discountType === "percent"
      ? input.pricing.discountAmount
      : null;

  const bonusResult = await applyDiscountBonus(
    rateAfterCeiling,
    input.ceilingRate,
    discountPercent,
    input.discountBonusEligible && input.discountBonusOptedIn,
    config,
  );

  // Layer 3: temporary reduction (if an active grant exists for this provider)
  let rateAfterAllReductions = bonusResult.effectiveRate;
  const tempPts = input.activeTemporaryReduction ?? 0;
  if (tempPts > 0) {
    rateAfterAllReductions -= tempPts;
  }

  // Floor: applied exactly once, after all reductions, to prevent negative rates.
  // Perks matrix Section 1: floor = 4% (config key: commission_stacking_floor).
  const flooredRate = await applyStackingFloor(rateAfterAllReductions, config);
  const floorApplied = flooredRate > rateAfterAllReductions;

  const commissionAmount = round2dp(finalPrice * flooredRate);
  const providerPayoutAmount = round2dp(finalPrice - commissionAmount);

  return {
    finalPrice,
    commissionAmount,
    providerPayoutAmount,
    commissionRate: flooredRate,
    standardRate,
    bonusApplied: bonusResult.bonusApplies,
    bonusPoints: bonusResult.bonusPoints,
    temporaryReductionApplied: tempPts > 0,
    temporaryReductionPoints: tempPts,
    floorApplied,
  };
}

// Legacy single-rate calculateCommission — kept for backward compat with
// existing tests and callers that haven't migrated to the bracket system yet.
export async function calculateCommission(
  pricing: ServicePricing,
  config: ConfigStore,
): Promise<CommissionResult> {
  const result = await calculateCommissionFull(
    {
      pricing,
      ceilingRate: null,
      discountBonusEligible: false,
      discountBonusOptedIn: false,
      activeTemporaryReduction: null,
    },
    config,
  );
  return result;
}

// ---------- Payout eligibility ----------
//
// Credit model: payment_status='captured' means credits were spent at booking
// confirmation (not a separate PSP capture). Payout releases when the customer
// confirms completion and a provider_payouts pending row is created.

export interface PayoutEligibilityInput {
  bookingStatus: string;
  paymentStatus: string | null;
}

export interface PayoutEligibilityResult {
  eligible: boolean;
  reason: string;
}

export function checkPayoutEligibility(
  input: PayoutEligibilityInput,
): PayoutEligibilityResult {
  const isCompleted = input.bookingStatus === "completed";
  const isCaptured = input.paymentStatus === "captured";

  if (isCompleted && isCaptured) {
    return { eligible: true, reason: "Booking completed and payment captured." };
  }
  if (isCompleted && !isCaptured) {
    return {
      eligible: false,
      reason: `Booking is completed but payment status is "${input.paymentStatus ?? "null"}" (not captured). Hold payout until PSP confirms capture.`,
    };
  }
  if (!isCompleted && isCaptured) {
    return {
      eligible: false,
      reason: `Payment is captured but booking status is "${input.bookingStatus}" (not completed). Payout only releases on booking completion.`,
    };
  }
  return {
    eligible: false,
    reason: `Neither condition met: booking="${input.bookingStatus}", payment="${input.paymentStatus ?? "null"}".`,
  };
}

// ---------- Price-change moderation (Section 5.2–5.5) ----------
//
// PRICE-LOGIC-001 through PRICE-LOGIC-007.
// Input: service's last SALE price (not listed price) and current list price.

export type PriceChangeBand =
  | "within_5"          // ≤ 5.0%  — eligible, not flagged, live
  | "band_5_to_9_5"    // 5.0001–9.4999% — not eligible, not flagged, live
  | "band_9_5_to_25"   // 9.5–24.9999% — not eligible, flagged if demand NOT met, live
  | "band_25_to_50"    // 25–49.9999% — not eligible, always flagged, live
  | "band_50_plus"     // ≥ 50% — not eligible, always flagged, held for review
  | "no_prior_sale";   // no sale ever — not eligible, not flagged

export interface PriceChangeInput {
  currentListPrice: number;
  lastSalePrice: number | null;   // null = no prior sale
  completedSalesInQualifyingBand: number;  // PRICE-LOGIC-004
}

export interface PriceChangeResult {
  band: PriceChangeBand;
  discountEligible: boolean;
  flagged: boolean;
  // true = new price is held; old price stays live (PRICE-LOGIC-006)
  priceHeld: boolean;
  // pct increase from last sale to current list (null if no prior sale)
  increasePercent: number | null;
}

export function evaluatePriceChange(
  input: PriceChangeInput,
): PriceChangeResult {
  const { currentListPrice, lastSalePrice, completedSalesInQualifyingBand } =
    input;

  // PRICE-LOGIC-003: no prior sale — not eligible, not flagged
  if (lastSalePrice === null) {
    return {
      band: "no_prior_sale",
      discountEligible: false,
      flagged: false,
      priceHeld: false,
      increasePercent: null,
    };
  }

  const increasePercent =
    ((currentListPrice - lastSalePrice) / lastSalePrice) * 100;

  // Band 1: ≤ 5.0% — eligible
  if (increasePercent <= 5.0) {
    return {
      band: "within_5",
      discountEligible: true,
      flagged: false,
      priceHeld: false,
      increasePercent,
    };
  }

  // Band 2: 5.0001% to 9.4999% — not eligible, not flagged
  if (increasePercent < 9.5) {
    return {
      band: "band_5_to_9_5",
      discountEligible: false,
      flagged: false,
      priceHeld: false,
      increasePercent,
    };
  }

  // Band 3: 9.5% to 24.9999% — flagged only if demand NOT met
  // PRICE-LOGIC-004/005: high demand = 3+ completed sales in qualifying band
  if (increasePercent < 25.0) {
    const highDemand = completedSalesInQualifyingBand >= 3;
    return {
      band: "band_9_5_to_25",
      discountEligible: false,
      flagged: !highDemand,
      priceHeld: false,
      increasePercent,
    };
  }

  // Band 4: 25% to 49.9999% — always flagged, price goes live (PRICE-LOGIC-007)
  if (increasePercent < 50.0) {
    return {
      band: "band_25_to_50",
      discountEligible: false,
      flagged: true,
      priceHeld: false,
      increasePercent,
    };
  }

  // Band 5: ≥ 50% — always flagged, new price HELD (PRICE-LOGIC-006)
  return {
    band: "band_50_plus",
    discountEligible: false,
    flagged: true,
    priceHeld: true,
    increasePercent,
  };
}

// ---------- Discount-bonus eligibility verification (Section 5.2) ----------
//
// PRICE-LOGIC-001/002: the prior sale must be within the qualifying band
// (current list price down to current list price - 5%). Checking sales
// history, NOT listing/edit history.

export interface DiscountEligibilityInput {
  currentListPrice: number;
  lastSalePrice: number | null;
}

export function checkDiscountEligibility(
  input: DiscountEligibilityInput,
): boolean {
  const { currentListPrice, lastSalePrice } = input;

  // PRICE-LOGIC-003: no prior sale → not eligible
  if (lastSalePrice === null) return false;

  // Qualifying band: current list price down to (current list price × 0.95)
  const bandLower = currentListPrice * 0.95;
  return lastSalePrice >= bandLower && lastSalePrice <= currentListPrice;
}

// ---------- Notification events (Section 5.6) ----------
// Returned by the async check; caller persists/dispatches these.

export type PricingNotificationType =
  | "discount_bonus_available"   // both conditions met, provider must opt in
  | "price_flagged"              // 9.5–50% band and flagged
  | "price_held_for_review";     // 50%+ band

export interface PricingNotification {
  type: PricingNotificationType;
  providerId: string;
  serviceId: string;
  payload: Record<string, unknown>;
}

export interface PriceEditCheckInput {
  providerId: string;
  serviceId: string;
  currentListPrice: number;
  newDiscountType: DiscountType;
  newDiscountPercent: number | null;  // only for 'percent' type
  lastSalePrice: number | null;
  completedSalesInQualifyingBand: number;
  ceilingRate: number | null;
}

export function evaluatePriceEdit(
  input: PriceEditCheckInput,
): PricingNotification[] {
  const notifications: PricingNotification[] = [];

  const { providerId, serviceId, currentListPrice, newDiscountType,
    newDiscountPercent, lastSalePrice, completedSalesInQualifyingBand,
    ceilingRate } = input;

  const priceChange = evaluatePriceChange({
    currentListPrice,
    lastSalePrice,
    completedSalesInQualifyingBand,
  });

  const discountEligible = checkDiscountEligibility({
    currentListPrice,
    lastSalePrice,
  });

  // Discount bonus notification (Section 5.6 condition 1)
  const isExactly10Percent =
    newDiscountType === "percent" &&
    newDiscountPercent !== null &&
    Math.abs(newDiscountPercent - 10) < 0.0001;

  const hasCeilingPackage = ceilingRate !== null;

  if (discountEligible && isExactly10Percent && hasCeilingPackage) {
    notifications.push({
      type: "discount_bonus_available",
      providerId,
      serviceId,
      payload: { ceilingRate, discountPercent: newDiscountPercent },
    });
  }

  // Price flagged notification (Section 5.6 condition 2)
  if (priceChange.flagged) {
    notifications.push({
      type: "price_flagged",
      providerId,
      serviceId,
      payload: {
        band: priceChange.band,
        increasePercent: priceChange.increasePercent,
      },
    });
  }

  // Price held notification (Section 5.6 condition 3)
  if (priceChange.priceHeld) {
    notifications.push({
      type: "price_held_for_review",
      providerId,
      serviceId,
      payload: {
        increasePercent: priceChange.increasePercent,
        lastSalePrice,
        newListPrice: currentListPrice,
      },
    });
  }

  return notifications;
}

// ---------- Utility ----------

function round2dp(n: number): number {
  return Math.round(n * 100) / 100;
}
