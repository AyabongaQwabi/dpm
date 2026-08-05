import { describe, it, expect, beforeEach } from "vitest";
import {
  applyDiscount,
  calculateCommission,
  calculateCommissionFull,
  applyCeiling,
  applyDiscountBonus,
  selectBracket,
  getCommissionBrackets,
  evaluatePriceChange,
  checkDiscountEligibility,
  evaluatePriceEdit,
  checkPayoutEligibility,
  type ServicePricing,
  type CommissionBracket,
} from "../payments";
import { CONFIG_KEYS } from "../config";
import { makePricingConfigStore } from "../../pricing-config";

// ---------- Shared fixture — single source of truth via pricing-config.ts ----------

async function makeConfig() {
  return makePricingConfigStore();
}

// ---------- applyDiscount ----------

describe("applyDiscount", () => {
  it("returns price unchanged when type is none", () => {
    expect(applyDiscount({ price: 1200, discountType: "none", discountAmount: null })).toBe(1200);
  });

  it("applies percent discount", () => {
    expect(applyDiscount({ price: 1000, discountType: "percent", discountAmount: 10 })).toBeCloseTo(900, 2);
  });

  it("applies fixed-amount discount", () => {
    expect(applyDiscount({ price: 1200, discountType: "amount", discountAmount: 200 })).toBe(1000);
  });

  it("throws when fixed discount exceeds price", () => {
    expect(() => applyDiscount({ price: 100, discountType: "amount", discountAmount: 150 })).toThrow(RangeError);
  });

  it("throws when percent is out of range", () => {
    expect(() => applyDiscount({ price: 1200, discountType: "percent", discountAmount: 110 })).toThrow(RangeError);
  });
});

// ---------- Bracket selection ----------

describe("selectBracket — boundary values", () => {
  let brackets: CommissionBracket[];

  beforeEach(async () => {
    brackets = await getCommissionBrackets(await makeConfig());
  });

  it("selects bracket 1 at R0", () => {
    expect(selectBracket(0, brackets).rate).toBe(0.075);
  });

  it("selects bracket 1 at R999 (upper boundary)", () => {
    expect(selectBracket(999, brackets).rate).toBe(0.075);
  });

  it("selects bracket 2 at R1000 (lower boundary of bracket 2)", () => {
    expect(selectBracket(1000, brackets).rate).toBe(0.085);
  });

  it("selects bracket 2 at R4999 (upper boundary)", () => {
    expect(selectBracket(4999, brackets).rate).toBe(0.085);
  });

  it("selects bracket 3 at R5000 (lower boundary of bracket 3)", () => {
    expect(selectBracket(5000, brackets).rate).toBe(0.095);
  });

  it("selects bracket 3 at R9999 (upper boundary)", () => {
    expect(selectBracket(9999, brackets).rate).toBe(0.095);
  });

  it("selects bracket 4 at R10000 (lower boundary of bracket 4)", () => {
    expect(selectBracket(10000, brackets).rate).toBe(0.10);
  });

  it("selects bracket 4 at R49999 (upper boundary)", () => {
    expect(selectBracket(49999, brackets).rate).toBe(0.10);
  });

  it("selects bracket 5 at R50000 (lower boundary of bracket 5)", () => {
    expect(selectBracket(50000, brackets).rate).toBe(0.1275);
  });

  it("selects bracket 5 at R74300", () => {
    expect(selectBracket(74300, brackets).rate).toBe(0.1275);
  });
});

// ---------- Source-doc worked examples (Section 2) ----------

describe("calculateCommissionFull — source doc worked examples", () => {
  let config: Awaited<ReturnType<typeof makeConfig>>;
  beforeEach(async () => { config = await makeConfig(); });

  async function calc(price: number) {
    return calculateCommissionFull(
      { pricing: { price, discountType: "none", discountAmount: null }, ceilingRate: null, discountBonusEligible: false, discountBonusOptedIn: false },
      config,
    );
  }

  it("R500 → 7.5% = R37.50 commission (bracket 1)", async () => {
    const r = await calc(500);
    expect(r.commissionAmount).toBe(37.50);
    expect(r.providerPayoutAmount).toBe(462.50);
    expect(r.standardRate).toBe(0.075);
  });

  it("R3500 → 8.5% = R297.50 commission (bracket 2)", async () => {
    const r = await calc(3500);
    expect(r.commissionAmount).toBe(297.50);
    expect(r.providerPayoutAmount).toBe(3202.50);
    expect(r.standardRate).toBe(0.085);
  });

  it("R6300 → 9.5% = R598.50 commission (bracket 3)", async () => {
    const r = await calc(6300);
    expect(r.commissionAmount).toBe(598.50);
    expect(r.providerPayoutAmount).toBe(5701.50);
    expect(r.standardRate).toBe(0.095);
  });

  it("R48500 → 10.0% = R4850.00 commission (bracket 4)", async () => {
    const r = await calc(48500);
    expect(r.commissionAmount).toBe(4850.00);
    expect(r.providerPayoutAmount).toBe(43650.00);
    expect(r.standardRate).toBe(0.10);
  });

  it("R74300 → 12.75% = R9473.25 commission (bracket 5)", async () => {
    const r = await calc(74300);
    expect(r.commissionAmount).toBe(9473.25);
    expect(r.providerPayoutAmount).toBe(64826.75);
    expect(r.standardRate).toBe(0.1275);
  });
});

// ---------- Commission is per-sale, not cumulative ----------

describe("calculateCommissionFull — per-sale independent bracketing (ARCH)", () => {
  let config: Awaited<ReturnType<typeof makeConfig>>;
  beforeEach(async () => { config = await makeConfig(); });

  it("two sales in the same billing period are independently evaluated", async () => {
    const [r500, r23000] = await Promise.all([
      calculateCommissionFull({ pricing: { price: 500, discountType: "none", discountAmount: null }, ceilingRate: null, discountBonusEligible: false, discountBonusOptedIn: false }, config),
      calculateCommissionFull({ pricing: { price: 23000, discountType: "none", discountAmount: null }, ceilingRate: null, discountBonusEligible: false, discountBonusOptedIn: false }, config),
    ]);
    expect(r500.standardRate).toBe(0.075);   // bracket 1
    expect(r23000.standardRate).toBe(0.10);  // bracket 4
  });
});

// ---------- Legacy calculateCommission wrapper ----------

describe("calculateCommission (legacy wrapper)", () => {
  it("produces same result as calculateCommissionFull with no ceiling/bonus", async () => {
    const config = await makeConfig();
    const pricing = { price: 3500, discountType: "none" as const, discountAmount: null };
    const legacy = await calculateCommission(pricing, config);
    const full = await calculateCommissionFull({ pricing, ceilingRate: null, discountBonusEligible: false, discountBonusOptedIn: false }, config);
    expect(legacy.commissionAmount).toBe(full.commissionAmount);
    expect(legacy.standardRate).toBe(full.standardRate);
  });
});

// ---------- Ceiling packages (Section 3) ----------

describe("applyCeiling", () => {
  it("returns standard rate when no ceiling package (null)", () => {
    expect(applyCeiling(0.1275, null)).toBe(0.1275);
  });

  it("caps bracket 5 (12.75%) to the 10% ceiling", () => {
    expect(applyCeiling(0.1275, 0.10)).toBe(0.10);
  });

  it("caps bracket 4 (10%) to the 9.5% ceiling", () => {
    expect(applyCeiling(0.10, 0.095)).toBe(0.095);
  });

  it("does NOT raise a rate already below the ceiling (bracket 1 stays at 7.5% with 8.5% ceiling)", () => {
    expect(applyCeiling(0.075, 0.085)).toBe(0.075);
  });

  it("ceiling equal to standard rate → no change", () => {
    expect(applyCeiling(0.085, 0.085)).toBe(0.085);
  });
});

// Property: ceiling can only lower or match — never raise
describe("ceiling property — rate never raised by ceiling package", () => {
  const ceilingRates = [0.10, 0.095, 0.085, 0.075];

  const samplePrices = [
    100, 500, 999, 1000, 2500, 4999, 5000, 7500, 9999,
    10000, 25000, 49999, 50000, 74300, 100000,
  ];

  for (const price of samplePrices) {
    for (const ceilingRate of ceilingRates) {
      it(`R${price} with ${ceilingRate * 100}% ceiling → effective ≤ standard`, async () => {
        const config = await makeConfig();
        const noPackage = await calculateCommissionFull(
          { pricing: { price, discountType: "none", discountAmount: null }, ceilingRate: null, discountBonusEligible: false, discountBonusOptedIn: false },
          config,
        );
        const withPackage = await calculateCommissionFull(
          { pricing: { price, discountType: "none", discountAmount: null }, ceilingRate, discountBonusEligible: false, discountBonusOptedIn: false },
          config,
        );
        expect(withPackage.commissionRate).toBeLessThanOrEqual(noPackage.standardRate + 0.0001);
        expect(withPackage.commissionAmount).toBeLessThanOrEqual(noPackage.commissionAmount + 0.01);
      });
    }
  }
});

// Source-doc worked example: R75,000 sale with 9.5% ceiling
describe("ceiling worked example — R75000 with 9.5% ceiling (Section 3)", () => {
  let config: Awaited<ReturnType<typeof makeConfig>>;
  beforeEach(async () => { config = await makeConfig(); });

  it("no package → 12.75% → R9562.50", async () => {
    const r = await calculateCommissionFull(
      { pricing: { price: 75000, discountType: "none", discountAmount: null }, ceilingRate: null, discountBonusEligible: false, discountBonusOptedIn: false },
      config,
    );
    expect(r.commissionAmount).toBe(9562.50);
  });

  it("9.5% ceiling → R7125.00 commission", async () => {
    const r = await calculateCommissionFull(
      { pricing: { price: 75000, discountType: "none", discountAmount: null }, ceilingRate: 0.095, discountBonusEligible: false, discountBonusOptedIn: false },
      config,
    );
    expect(r.commissionAmount).toBe(7125.00);
    expect(r.commissionRate).toBe(0.095);
  });
});

// ---------- Discount-unlock bonus (Section 4) ----------

describe("applyDiscountBonus", () => {
  let config: Awaited<ReturnType<typeof makeConfig>>;
  beforeEach(async () => { config = await makeConfig(); });

  it("no bonus when no ceiling package (null)", async () => {
    const r = await applyDiscountBonus(0.075, null, 10, true, config);
    expect(r.bonusApplies).toBe(false);
    expect(r.effectiveRate).toBe(0.075);
    expect(r.bonusPoints).toBe(0);
  });

  it("no bonus when discount is not exactly 10% (15%)", async () => {
    const r = await applyDiscountBonus(0.075, 0.075, 15, true, config);
    expect(r.bonusApplies).toBe(false);
  });

  it("no bonus when discount is 9.9% (just below 10%)", async () => {
    const r = await applyDiscountBonus(0.075, 0.075, 9.9, true, config);
    expect(r.bonusApplies).toBe(false);
  });

  it("no bonus when discount is 10.1% (just above 10%)", async () => {
    const r = await applyDiscountBonus(0.075, 0.075, 10.1, true, config);
    expect(r.bonusApplies).toBe(false);
  });

  it("no bonus when not eligible (gaming prevented)", async () => {
    const r = await applyDiscountBonus(0.075, 0.075, 10, false, config);
    expect(r.bonusApplies).toBe(false);
  });

  it("no bonus when discount is null (non-percent discount type)", async () => {
    const r = await applyDiscountBonus(0.075, 0.075, null, true, config);
    expect(r.bonusApplies).toBe(false);
  });

  it("10% ceiling: 10% → 7.5% effective (−2.5 pts)", async () => {
    const r = await applyDiscountBonus(0.10, 0.10, 10, true, config);
    expect(r.bonusApplies).toBe(true);
    expect(r.effectiveRate).toBeCloseTo(0.075, 5);
    expect(r.bonusPoints).toBeCloseTo(0.025, 5);
  });

  it("9.5% ceiling: 9.5% → 6.5% effective (−3.0 pts)", async () => {
    const r = await applyDiscountBonus(0.095, 0.095, 10, true, config);
    expect(r.bonusApplies).toBe(true);
    expect(r.effectiveRate).toBeCloseTo(0.065, 5);
    expect(r.bonusPoints).toBeCloseTo(0.030, 5);
  });

  it("8.5% ceiling: 8.5% → 5.0% effective (−3.5 pts)", async () => {
    const r = await applyDiscountBonus(0.085, 0.085, 10, true, config);
    expect(r.bonusApplies).toBe(true);
    expect(r.effectiveRate).toBeCloseTo(0.05, 5);
    expect(r.bonusPoints).toBeCloseTo(0.035, 5);
  });

  it("7.5% ceiling: 7.5% → 3.0% effective (−4.5 pts)", async () => {
    const r = await applyDiscountBonus(0.075, 0.075, 10, true, config);
    expect(r.bonusApplies).toBe(true);
    expect(r.effectiveRate).toBeCloseTo(0.03, 5);
    expect(r.bonusPoints).toBeCloseTo(0.045, 5);
  });
});

// Source-doc worked example: R999 service, 10% discount, 7.5% ceiling
describe("discount bonus worked example — R999, 10% off, 7.5% ceiling", () => {
  let config: Awaited<ReturnType<typeof makeConfig>>;
  beforeEach(async () => { config = await makeConfig(); });

  it("customer pays R899.10 (R999 × 90%)", async () => {
    const r = await calculateCommissionFull({
      pricing: { price: 999, discountType: "percent", discountAmount: 10 },
      ceilingRate: 0.075,
      discountBonusEligible: true,
      discountBonusOptedIn: true,
    }, config);
    expect(r.finalPrice).toBeCloseTo(899.10, 1);
  });

  it("with 4.5pt bonus → raw 3.0%, floored to 4% by stacking floor → ~R35.96 commission", async () => {
    // Source doc worked example shows 3.0% / R26.97 — that was before the stacking
    // floor was added (perks matrix, Section 1). The floor (confirmed 4%) clamps
    // the 3.0% raw rate to 4%, so the commission is 4% of R899.10 = R35.96.
    const r = await calculateCommissionFull({
      pricing: { price: 999, discountType: "percent", discountAmount: 10 },
      ceilingRate: 0.075,
      discountBonusEligible: true,
      discountBonusOptedIn: true,
    }, config);
    expect(r.commissionRate).toBeCloseTo(0.04, 5);  // floored from 3.0% to 4%
    expect(r.commissionAmount).toBeCloseTo(899.10 * 0.04, 2);
    expect(r.bonusApplied).toBe(true);
    expect(r.floorApplied).toBe(true);
  });

  it("without opt-in → standard 7.5% → ~R67.43 commission", async () => {
    const r = await calculateCommissionFull({
      pricing: { price: 999, discountType: "percent", discountAmount: 10 },
      ceilingRate: 0.075,
      discountBonusEligible: true,
      discountBonusOptedIn: false,
    }, config);
    expect(r.commissionAmount).toBeCloseTo(67.43, 1);
    expect(r.bonusApplied).toBe(false);
  });
});

// ---------- Price-change moderation (Section 5.2–5.5) ----------

describe("evaluatePriceChange — no prior sale", () => {
  it("no prior sale → not eligible, not flagged, not held, increasePercent null", () => {
    const r = evaluatePriceChange({ currentListPrice: 1000, lastSalePrice: null, completedSalesInQualifyingBand: 0 });
    expect(r.band).toBe("no_prior_sale");
    expect(r.discountEligible).toBe(false);
    expect(r.flagged).toBe(false);
    expect(r.priceHeld).toBe(false);
    expect(r.increasePercent).toBeNull();
  });
});

describe("evaluatePriceChange — Band 1 (≤ 5.0%)", () => {
  it("0% increase → eligible, not flagged, live", () => {
    const r = evaluatePriceChange({ currentListPrice: 1000, lastSalePrice: 1000, completedSalesInQualifyingBand: 0 });
    expect(r.band).toBe("within_5");
    expect(r.discountEligible).toBe(true);
    expect(r.flagged).toBe(false);
    expect(r.priceHeld).toBe(false);
  });

  it("exactly +5.0% → eligible, not flagged (boundary is inclusive)", () => {
    const r = evaluatePriceChange({ currentListPrice: 1050, lastSalePrice: 1000, completedSalesInQualifyingBand: 0 });
    expect(r.band).toBe("within_5");
    expect(r.discountEligible).toBe(true);
    expect(r.flagged).toBe(false);
    expect(r.priceHeld).toBe(false);
    expect(r.increasePercent).toBeCloseTo(5.0, 5);
  });

  it("price decrease → eligible, not flagged", () => {
    const r = evaluatePriceChange({ currentListPrice: 900, lastSalePrice: 1000, completedSalesInQualifyingBand: 0 });
    expect(r.band).toBe("within_5");
    expect(r.discountEligible).toBe(true);
    expect(r.flagged).toBe(false);
  });
});

describe("evaluatePriceChange — Band 2 (5.0001% to 9.4999%)", () => {
  it("+5.0001% → not eligible, not flagged, live", () => {
    const r = evaluatePriceChange({ currentListPrice: 10500.01, lastSalePrice: 10000, completedSalesInQualifyingBand: 0 });
    expect(r.band).toBe("band_5_to_9_5");
    expect(r.discountEligible).toBe(false);
    expect(r.flagged).toBe(false);
    expect(r.priceHeld).toBe(false);
  });

  it("+9.4999% → not eligible, not flagged (just below band 3)", () => {
    const r = evaluatePriceChange({ currentListPrice: 10949.99, lastSalePrice: 10000, completedSalesInQualifyingBand: 0 });
    expect(r.band).toBe("band_5_to_9_5");
    expect(r.discountEligible).toBe(false);
    expect(r.flagged).toBe(false);
  });
});

describe("evaluatePriceChange — Band 3 (9.5% to 24.9999%)", () => {
  it("+9.5%, demand NOT met (0 sales) → not eligible, FLAGGED, live", () => {
    const r = evaluatePriceChange({ currentListPrice: 10950, lastSalePrice: 10000, completedSalesInQualifyingBand: 0 });
    expect(r.band).toBe("band_9_5_to_25");
    expect(r.discountEligible).toBe(false);
    expect(r.flagged).toBe(true);
    expect(r.priceHeld).toBe(false);
  });

  it("+9.5%, demand met (exactly 3 sales — threshold) → NOT flagged", () => {
    const r = evaluatePriceChange({ currentListPrice: 10950, lastSalePrice: 10000, completedSalesInQualifyingBand: 3 });
    expect(r.band).toBe("band_9_5_to_25");
    expect(r.flagged).toBe(false);
    expect(r.priceHeld).toBe(false);
  });

  it("+9.5%, demand = 2 (below threshold) → flagged", () => {
    const r = evaluatePriceChange({ currentListPrice: 10950, lastSalePrice: 10000, completedSalesInQualifyingBand: 2 });
    expect(r.flagged).toBe(true);
  });

  it("+9.5%, demand = 4 (above threshold) → NOT flagged", () => {
    const r = evaluatePriceChange({ currentListPrice: 10950, lastSalePrice: 10000, completedSalesInQualifyingBand: 4 });
    expect(r.flagged).toBe(false);
  });

  it("+24.9999% → band 3, flagged when demand not met", () => {
    const r = evaluatePriceChange({ currentListPrice: 12499.99, lastSalePrice: 10000, completedSalesInQualifyingBand: 0 });
    expect(r.band).toBe("band_9_5_to_25");
    expect(r.flagged).toBe(true);
  });

  it("+24.9999% → band 3, NOT flagged when demand met", () => {
    const r = evaluatePriceChange({ currentListPrice: 12499.99, lastSalePrice: 10000, completedSalesInQualifyingBand: 3 });
    expect(r.band).toBe("band_9_5_to_25");
    expect(r.flagged).toBe(false);
  });
});

describe("evaluatePriceChange — Band 4 (25% to 49.9999%)", () => {
  it("exactly +25% → ALWAYS flagged, NOT held, demand irrelevant", () => {
    const r = evaluatePriceChange({ currentListPrice: 12500, lastSalePrice: 10000, completedSalesInQualifyingBand: 100 });
    expect(r.band).toBe("band_25_to_50");
    expect(r.flagged).toBe(true);
    expect(r.priceHeld).toBe(false);
    expect(r.discountEligible).toBe(false);
  });

  it("+25%, 9999 sales → still flagged (demand exemption does NOT apply in band 4)", () => {
    const r = evaluatePriceChange({ currentListPrice: 12500, lastSalePrice: 10000, completedSalesInQualifyingBand: 9999 });
    expect(r.flagged).toBe(true);
  });

  it("+49.9999% → band 4, flagged, NOT held", () => {
    const r = evaluatePriceChange({ currentListPrice: 14999.99, lastSalePrice: 10000, completedSalesInQualifyingBand: 0 });
    expect(r.band).toBe("band_25_to_50");
    expect(r.flagged).toBe(true);
    expect(r.priceHeld).toBe(false);
  });
});

describe("evaluatePriceChange — Band 5 (≥ 50%)", () => {
  it("exactly +50% → flagged AND held for review", () => {
    const r = evaluatePriceChange({ currentListPrice: 15000, lastSalePrice: 10000, completedSalesInQualifyingBand: 0 });
    expect(r.band).toBe("band_50_plus");
    expect(r.flagged).toBe(true);
    expect(r.priceHeld).toBe(true);
    expect(r.discountEligible).toBe(false);
    expect(r.increasePercent).toBeCloseTo(50, 5);
  });

  it("+50%, 100 sales → still flagged and held (demand has no effect here)", () => {
    const r = evaluatePriceChange({ currentListPrice: 15000, lastSalePrice: 10000, completedSalesInQualifyingBand: 100 });
    expect(r.flagged).toBe(true);
    expect(r.priceHeld).toBe(true);
  });

  it("+100% → band 5, held", () => {
    const r = evaluatePriceChange({ currentListPrice: 20000, lastSalePrice: 10000, completedSalesInQualifyingBand: 0 });
    expect(r.band).toBe("band_50_plus");
    expect(r.priceHeld).toBe(true);
  });
});

// ---------- checkDiscountEligibility (Section 5.2) ----------

describe("checkDiscountEligibility (PRICE-LOGIC-001/002)", () => {
  it("no prior sale → not eligible", () => {
    expect(checkDiscountEligibility({ currentListPrice: 1000, lastSalePrice: null })).toBe(false);
  });

  it("last sale exactly at current list price → eligible", () => {
    expect(checkDiscountEligibility({ currentListPrice: 1000, lastSalePrice: 1000 })).toBe(true);
  });

  it("last sale at exactly 95% of current list (lower band boundary) → eligible", () => {
    expect(checkDiscountEligibility({ currentListPrice: 1000, lastSalePrice: 950 })).toBe(true);
  });

  it("last sale just below 95% → NOT eligible", () => {
    expect(checkDiscountEligibility({ currentListPrice: 1000, lastSalePrice: 949 })).toBe(false);
  });

  it("last sale within band (3% below) → eligible", () => {
    expect(checkDiscountEligibility({ currentListPrice: 1000, lastSalePrice: 970 })).toBe(true);
  });

  it("last sale well below band → not eligible", () => {
    expect(checkDiscountEligibility({ currentListPrice: 56667, lastSalePrice: 40000 })).toBe(false);
  });

  it("last sale above current list price → not eligible (outside band upper bound)", () => {
    expect(checkDiscountEligibility({ currentListPrice: 1000, lastSalePrice: 1050 })).toBe(false);
  });
});

// ---------- REGRESSION: anti-gaming scenario (Source doc Section 5.1) ----------

describe("REGRESSION — anti-gaming: inflated list price with exactly 10% discount", () => {
  let config: Awaited<ReturnType<typeof makeConfig>>;
  beforeEach(async () => { config = await makeConfig(); });

  it("prior sale far below inflated list → NOT eligible", () => {
    const eligible = checkDiscountEligibility({ currentListPrice: 56667, lastSalePrice: 40000 });
    expect(eligible).toBe(false);
  });

  it("no prior sale at all → NOT eligible", () => {
    const eligible = checkDiscountEligibility({ currentListPrice: 56667, lastSalePrice: null });
    expect(eligible).toBe(false);
  });

  it("full pipeline: inflated price + 10% discount + ceiling + no genuine sale → bonus NOT applied", async () => {
    const r = await calculateCommissionFull({
      pricing: { price: 56667, discountType: "percent", discountAmount: 10 },
      ceilingRate: 0.075,
      discountBonusEligible: false,  // eligibility check denied
      discountBonusOptedIn: true,    // provider tried to opt in
    }, config);
    expect(r.bonusApplied).toBe(false);
    expect(r.commissionRate).toBeCloseTo(0.075, 5);
  });

  it("genuine prior sale at inflated price (legitimate scenario) → eligible", () => {
    // R54500 >= R56667 * 0.95 = R53833.65 → within qualifying band
    const eligible = checkDiscountEligibility({ currentListPrice: 56667, lastSalePrice: 54500 });
    expect(eligible).toBe(true);
  });
});

// ---------- evaluatePriceEdit notifications (Section 5.6) ----------

describe("evaluatePriceEdit — notification flow", () => {
  it("eligible + exactly 10% + ceiling → discount_bonus_available", () => {
    const notifications = evaluatePriceEdit({
      providerId: "prov-1",
      serviceId: "svc-1",
      currentListPrice: 1000,
      newDiscountType: "percent",
      newDiscountPercent: 10,
      lastSalePrice: 980,
      completedSalesInQualifyingBand: 0,
      ceilingRate: 0.075,
    });
    expect(notifications.map((n) => n.type)).toContain("discount_bonus_available");
  });

  it("eligible + exactly 10% but NO ceiling → no bonus notification", () => {
    const types = evaluatePriceEdit({
      providerId: "prov-1",
      serviceId: "svc-1",
      currentListPrice: 1000,
      newDiscountType: "percent",
      newDiscountPercent: 10,
      lastSalePrice: 980,
      completedSalesInQualifyingBand: 0,
      ceilingRate: null,
    }).map((n) => n.type);
    expect(types).not.toContain("discount_bonus_available");
  });

  it("+9.5% increase, demand not met → price_flagged (no hold)", () => {
    const types = evaluatePriceEdit({
      providerId: "prov-1",
      serviceId: "svc-1",
      currentListPrice: 1095,
      newDiscountType: "none",
      newDiscountPercent: null,
      lastSalePrice: 1000,
      completedSalesInQualifyingBand: 0,
      ceilingRate: null,
    }).map((n) => n.type);
    expect(types).toContain("price_flagged");
    expect(types).not.toContain("price_held_for_review");
  });

  it("+9.5%, demand met → no flag notification", () => {
    const types = evaluatePriceEdit({
      providerId: "prov-1",
      serviceId: "svc-1",
      currentListPrice: 1095,
      newDiscountType: "none",
      newDiscountPercent: null,
      lastSalePrice: 1000,
      completedSalesInQualifyingBand: 3,
      ceilingRate: null,
    }).map((n) => n.type);
    expect(types).not.toContain("price_flagged");
  });

  it("+50% → price_flagged AND price_held_for_review (demand irrelevant)", () => {
    const types = evaluatePriceEdit({
      providerId: "prov-1",
      serviceId: "svc-1",
      currentListPrice: 1500,
      newDiscountType: "none",
      newDiscountPercent: null,
      lastSalePrice: 1000,
      completedSalesInQualifyingBand: 100,
      ceilingRate: null,
    }).map((n) => n.type);
    expect(types).toContain("price_flagged");
    expect(types).toContain("price_held_for_review");
  });

  it("discount not exactly 10% + no eligible prior sale → no notifications", () => {
    // +15% from R1000 → R1150 (band 3, demand not met → flagged)
    // but discount is 15%, not 10% → no bonus notification
    const types = evaluatePriceEdit({
      providerId: "prov-1",
      serviceId: "svc-1",
      currentListPrice: 1150,  // +15% from R1000 → band 3
      newDiscountType: "percent",
      newDiscountPercent: 15,  // not 10% → no bonus
      lastSalePrice: 1000,     // R1000 vs qualifying band min R1150*0.95=R1092.50 → NOT eligible
      completedSalesInQualifyingBand: 0,
      ceilingRate: 0.095,
    }).map((n) => n.type);
    expect(types).toContain("price_flagged");
    expect(types).not.toContain("discount_bonus_available");
  });

  it("last sale outside qualifying band → flag fires, bonus blocked (anti-gaming)", () => {
    // Price increased 10% to R1100; last sale was at R1000 which is BELOW
    // the qualifying band min (R1100 × 0.95 = R1045)
    const types = evaluatePriceEdit({
      providerId: "prov-1",
      serviceId: "svc-1",
      currentListPrice: 1100,
      newDiscountType: "percent",
      newDiscountPercent: 10,
      lastSalePrice: 1000,    // R1000 < R1045 → outside qualifying band
      completedSalesInQualifyingBand: 0,
      ceilingRate: 0.095,
    }).map((n) => n.type);
    expect(types).toContain("price_flagged");
    expect(types).not.toContain("discount_bonus_available");
  });

  it("no prior sale → zero notifications", () => {
    const notifications = evaluatePriceEdit({
      providerId: "prov-1",
      serviceId: "svc-1",
      currentListPrice: 1000,
      newDiscountType: "percent",
      newDiscountPercent: 10,
      lastSalePrice: null,
      completedSalesInQualifyingBand: 0,
      ceilingRate: 0.075,
    });
    expect(notifications).toHaveLength(0);
  });

  it("notification payloads contain provider/service IDs and relevant data", () => {
    const notifications = evaluatePriceEdit({
      providerId: "prov-abc",
      serviceId: "svc-xyz",
      currentListPrice: 1500,
      newDiscountType: "none",
      newDiscountPercent: null,
      lastSalePrice: 1000,
      completedSalesInQualifyingBand: 0,
      ceilingRate: null,
    });
    const held = notifications.find((n) => n.type === "price_held_for_review");
    expect(held).toBeDefined();
    expect(held!.providerId).toBe("prov-abc");
    expect(held!.serviceId).toBe("svc-xyz");
    expect(held!.payload.newListPrice).toBe(1500);
    expect(held!.payload.lastSalePrice).toBe(1000);
  });
});

// ---------- getCommissionBrackets from config ----------

describe("getCommissionBrackets", () => {
  it("loads 5 brackets with correct boundaries and rates from config", async () => {
    const brackets = await getCommissionBrackets(await makeConfig());
    expect(brackets).toHaveLength(5);
    expect(brackets[0]).toMatchObject({ minPrice: 0, maxPrice: 999, rate: 0.075 });
    expect(brackets[1]).toMatchObject({ minPrice: 1000, maxPrice: 4999, rate: 0.085 });
    expect(brackets[2]).toMatchObject({ minPrice: 5000, maxPrice: 9999, rate: 0.095 });
    expect(brackets[3]).toMatchObject({ minPrice: 10000, maxPrice: 49999, rate: 0.10 });
    expect(brackets[4]).toMatchObject({ minPrice: 50000, maxPrice: Infinity, rate: 0.1275 });
  });
});

// ---------- checkPayoutEligibility ----------

describe("checkPayoutEligibility", () => {
  it("eligible when completed + captured", () => {
    expect(checkPayoutEligibility({ bookingStatus: "completed", paymentStatus: "captured" }).eligible).toBe(true);
  });

  it("not eligible when completed but not captured", () => {
    expect(checkPayoutEligibility({ bookingStatus: "completed", paymentStatus: "pending" }).eligible).toBe(false);
  });

  it("not eligible when captured but not completed", () => {
    expect(checkPayoutEligibility({ bookingStatus: "requested", paymentStatus: "captured" }).eligible).toBe(false);
  });

  it("not eligible when neither condition met", () => {
    expect(checkPayoutEligibility({ bookingStatus: "requested", paymentStatus: "pending" }).eligible).toBe(false);
  });
});

// =============================================================================
// STACKING FLOOR AND TEMPORARY REDUCTION TESTS
// Source: docs/docs/dpm_package_perks_matrix.docx
// =============================================================================

import {
  applyStackingFloor,
  getTemporaryReductionAmount,
  getTemporaryReductionMonths,
} from "../payments";

// ---------- applyStackingFloor ----------

describe("applyStackingFloor", () => {
  it("returns rate unchanged when above floor", async () => {
    const cfg = await makeConfig();
    const result = await applyStackingFloor(0.065, cfg);
    expect(result).toBeCloseTo(0.065, 6);
  });

  it("clamps rate to floor when below floor", async () => {
    const cfg = await makeConfig();
    const result = await applyStackingFloor(0.02, cfg);
    expect(result).toBeCloseTo(0.04, 6);
  });

  it("returns floor exactly when rate equals floor", async () => {
    const cfg = await makeConfig();
    const result = await applyStackingFloor(0.04, cfg);
    expect(result).toBeCloseTo(0.04, 6);
  });

  it("clamps a negative rate to floor (never negative commission)", async () => {
    const cfg = await makeConfig();
    const result = await applyStackingFloor(-0.005, cfg);
    expect(result).toBeCloseTo(0.04, 6);
  });

  it("respects a different floor when config is changed", async () => {
    const cfg = await makeConfig();
    cfg.set(CONFIG_KEYS.COMMISSION_STACKING_FLOOR, "0.03");
    const result = await applyStackingFloor(0.025, cfg);
    expect(result).toBeCloseTo(0.03, 6);
  });
});

// ---------- Worst-case regression (perks matrix, Section 1 table) ----------
//
// Package 5 (7.5% ceiling) + discount-unlock bonus (−4.5pt → 3.0%) +
// 6-month temporary reduction (−3.5pt) = raw rate of −0.5%.
// Without the floor this would make the platform owe money on every sale.
// With the 4% floor it must clamp to exactly 4%.

describe("REGRESSION: Package 5 worst-case stacking — floor prevents negative rate", () => {
  it("Package 5 ceiling 7.5% + discount-unlock −4.5pt + temp −3.5pt = raw −0.5% → floored to 4%", async () => {
    const cfg = await makeConfig();
    // Ceiling: 7.5% → 0.075
    // Discount-unlock bonus for 7.5% ceiling: −4.5pt → 0.075 − 0.045 = 0.030
    // Temporary reduction for Package 5: −3.5pt → 0.030 − 0.035 = −0.005 (−0.5%)
    const rawRate = 0.075 - 0.045 - 0.035;
    expect(rawRate).toBeCloseTo(-0.005, 6); // confirm the raw calc really is negative
    const floored = await applyStackingFloor(rawRate, cfg);
    expect(floored).toBeCloseTo(0.04, 6);   // floor clamps to 4%
  });

  it("full calculateCommissionFull on Package 5 worst-case clamps to 4% and marks floorApplied", async () => {
    const cfg = await makeConfig();
    const result = await calculateCommissionFull(
      {
        pricing: { price: 75000, discountType: "percent", discountAmount: 10 },
        ceilingRate: 0.075,             // Package 5
        discountBonusEligible: true,
        discountBonusOptedIn: true,
        activeTemporaryReduction: 0.035, // Package 5 temp reduction
      },
      cfg,
    );
    expect(result.commissionRate).toBeCloseTo(0.04, 6);
    expect(result.floorApplied).toBe(true);
    expect(result.commissionRate).toBeGreaterThanOrEqual(0.04);
  });
});

// ---------- Package 4 worst-case (also hits floor at 4%) ----------

describe("Package 4 worst-case stacking", () => {
  it("Package 4: 8.5% ceiling + −3.5pt bonus + −3.0pt temp = 2.0% raw → floored to 4%", async () => {
    const cfg = await makeConfig();
    // 0.085 − 0.035 − 0.030 = 0.020
    const rawRate = 0.085 - 0.035 - 0.030;
    expect(rawRate).toBeCloseTo(0.020, 6);
    const floored = await applyStackingFloor(rawRate, cfg);
    expect(floored).toBeCloseTo(0.04, 6);
  });

  it("full calculateCommissionFull on Package 4 worst-case clamps to 4%", async () => {
    const cfg = await makeConfig();
    const result = await calculateCommissionFull(
      {
        pricing: { price: 15000, discountType: "percent", discountAmount: 10 },
        ceilingRate: 0.085,
        discountBonusEligible: true,
        discountBonusOptedIn: true,
        activeTemporaryReduction: 0.030,
      },
      cfg,
    );
    expect(result.commissionRate).toBeCloseTo(0.04, 6);
    expect(result.floorApplied).toBe(true);
  });
});

// ---------- Cases that do NOT hit the floor (perks matrix Section 1 table) ----------

describe("Stacking combinations that do not hit the 4% floor", () => {
  it("Package 1 (no ceiling) + no bonus + temp −1.0pt on bracket-1 rate: 7.5% − 1.0% = 6.5%", async () => {
    const cfg = await makeConfig();
    // Package 1: no ceiling, bracket 1 standard rate = 7.5%, temp = −1.0pt
    const result = await calculateCommissionFull(
      {
        pricing: { price: 500, discountType: "none", discountAmount: null },
        ceilingRate: null,
        discountBonusEligible: false,
        discountBonusOptedIn: false,
        activeTemporaryReduction: 0.010,
      },
      cfg,
    );
    expect(result.commissionRate).toBeCloseTo(0.065, 6);
    expect(result.floorApplied).toBe(false);
  });

  it("Package 2: 10% ceiling + −2.5pt bonus + −1.6pt temp = 5.9% — above floor", async () => {
    const cfg = await makeConfig();
    // 0.10 − 0.025 − 0.016 = 0.059
    const result = await calculateCommissionFull(
      {
        pricing: { price: 75000, discountType: "percent", discountAmount: 10 },
        ceilingRate: 0.10,
        discountBonusEligible: true,
        discountBonusOptedIn: true,
        activeTemporaryReduction: 0.016,
      },
      cfg,
    );
    expect(result.commissionRate).toBeCloseTo(0.059, 6);
    expect(result.floorApplied).toBe(false);
  });

  it("Package 3: 9.5% ceiling + −3.0pt bonus + −2.0pt temp = 4.5% — above floor", async () => {
    const cfg = await makeConfig();
    // 0.095 − 0.030 − 0.020 = 0.045
    const result = await calculateCommissionFull(
      {
        pricing: { price: 75000, discountType: "percent", discountAmount: 10 },
        ceilingRate: 0.095,
        discountBonusEligible: true,
        discountBonusOptedIn: true,
        activeTemporaryReduction: 0.020,
      },
      cfg,
    );
    expect(result.commissionRate).toBeCloseTo(0.045, 6);
    expect(result.floorApplied).toBe(false);
  });
});

// ---------- Property-based floor test ----------
//
// Asserts that the effective rate is NEVER below the configured floor,
// across all package tiers, all bracket prices, all combinations of active
// discount layers. This is the automated guard against a quiet regression
// in the stacking logic.

describe("PROPERTY: effective commission rate never below configured floor", () => {
  const FLOOR = 0.04;

  const ceilingRates: Array<number | null> = [null, 0.10, 0.095, 0.085, 0.075];
  const tempReductions: Array<number | null> = [null, 0.010, 0.016, 0.020, 0.030, 0.035];
  const samplePrices = [100, 500, 999, 1000, 2500, 4999, 5000, 9999, 10000, 48500, 50000, 74300, 100000];
  const bonusStates = [
    { eligible: false, optedIn: false },
    { eligible: true,  optedIn: true  },
  ];

  for (const price of samplePrices) {
    for (const ceilingRate of ceilingRates) {
      for (const tempPts of tempReductions) {
        for (const bonus of bonusStates) {
          // Skip discount-bonus combos that can't apply (no ceiling)
          if (bonus.eligible && ceilingRate === null) continue;

          const label = [
            `price=${price}`,
            `ceiling=${ceilingRate ?? "none"}`,
            `temp=${tempPts ?? "none"}`,
            `bonus=${bonus.eligible ? "yes" : "no"}`,
          ].join(" ");

          it(`rate >= floor: ${label}`, async () => {
            const cfg = await makeConfig();
            const result = await calculateCommissionFull(
              {
                pricing: { price, discountType: bonus.eligible ? "percent" : "none", discountAmount: bonus.eligible ? 10 : null },
                ceilingRate,
                discountBonusEligible: bonus.eligible,
                discountBonusOptedIn: bonus.optedIn,
                activeTemporaryReduction: tempPts,
              },
              cfg,
            );
            expect(result.commissionRate).toBeGreaterThanOrEqual(FLOOR - 1e-9);
          });
        }
      }
    }
  }
});

// ---------- Temporary reduction helpers ----------

describe("getTemporaryReductionAmount", () => {
  it("returns correct reduction for each package", async () => {
    const cfg = await makeConfig();
    expect(await getTemporaryReductionAmount(1, cfg)).toBeCloseTo(0.010, 6);
    expect(await getTemporaryReductionAmount(2, cfg)).toBeCloseTo(0.016, 6);
    expect(await getTemporaryReductionAmount(3, cfg)).toBeCloseTo(0.020, 6);
    expect(await getTemporaryReductionAmount(4, cfg)).toBeCloseTo(0.030, 6);
    expect(await getTemporaryReductionAmount(5, cfg)).toBeCloseTo(0.035, 6);
  });
});

describe("getTemporaryReductionMonths", () => {
  it("returns correct duration for each package", async () => {
    const cfg = await makeConfig();
    expect(await getTemporaryReductionMonths(1, cfg)).toBe(3);
    expect(await getTemporaryReductionMonths(2, cfg)).toBe(3);
    expect(await getTemporaryReductionMonths(3, cfg)).toBe(3);
    expect(await getTemporaryReductionMonths(4, cfg)).toBe(3);
    expect(await getTemporaryReductionMonths(5, cfg)).toBe(6);
  });
});

// ---------- Full commission with temporary reduction — no bonus ----------

describe("calculateCommissionFull with temporary reduction only (no discount bonus)", () => {
  it("Package 5, R75,000 sale, temp reduction only: 7.5% − 3.5% ≈ 4% (floor clamps fractionally)", async () => {
    const cfg = await makeConfig();
    const result = await calculateCommissionFull(
      {
        pricing: { price: 75000, discountType: "none", discountAmount: null },
        ceilingRate: 0.075,
        discountBonusEligible: false,
        discountBonusOptedIn: false,
        activeTemporaryReduction: 0.035,
      },
      cfg,
    );
    // Due to floating point, 0.075 − 0.035 = 0.03999...9 which is fractionally
    // below 0.04, so the floor clamps it up to exactly 4%.
    expect(result.commissionRate).toBeCloseTo(0.04, 6);
    expect(result.temporaryReductionApplied).toBe(true);
    expect(result.temporaryReductionPoints).toBeCloseTo(0.035, 6);
    expect(result.commissionRate).toBeGreaterThanOrEqual(0.04);
  });

  it("Package 3, R6,000 sale, temp −2.0pt: 9.5% − 2.0% = 7.5% — above floor", async () => {
    const cfg = await makeConfig();
    const result = await calculateCommissionFull(
      {
        pricing: { price: 6000, discountType: "none", discountAmount: null },
        ceilingRate: 0.095,
        discountBonusEligible: false,
        discountBonusOptedIn: false,
        activeTemporaryReduction: 0.020,
      },
      cfg,
    );
    expect(result.commissionRate).toBeCloseTo(0.075, 6);
    expect(result.floorApplied).toBe(false);
    expect(result.temporaryReductionApplied).toBe(true);
    expect(result.commissionAmount).toBeCloseTo(6000 * 0.075, 2);
  });

  it("no active temporary reduction: temporaryReductionApplied is false", async () => {
    const cfg = await makeConfig();
    const result = await calculateCommissionFull(
      {
        pricing: { price: 6000, discountType: "none", discountAmount: null },
        ceilingRate: 0.095,
        discountBonusEligible: false,
        discountBonusOptedIn: false,
        activeTemporaryReduction: null,
      },
      cfg,
    );
    expect(result.temporaryReductionApplied).toBe(false);
    expect(result.temporaryReductionPoints).toBe(0);
    expect(result.commissionRate).toBeCloseTo(0.095, 6);
  });
});

// ---------- Legacy calculateCommission backward compat ----------

describe("legacy calculateCommission still works and respects floor", () => {
  it("produces same result as calculateCommissionFull with no ceiling/bonus/temp", async () => {
    const cfg = await makeConfig();
    const pricing: ServicePricing = { price: 5000, discountType: "none", discountAmount: null };
    const legacy = await calculateCommission(pricing, cfg);
    const full = await calculateCommissionFull(
      { pricing, ceilingRate: null, discountBonusEligible: false, discountBonusOptedIn: false, activeTemporaryReduction: null },
      cfg,
    );
    expect(legacy.commissionRate).toBe(full.commissionRate);
    expect(legacy.commissionAmount).toBe(full.commissionAmount);
  });
});
