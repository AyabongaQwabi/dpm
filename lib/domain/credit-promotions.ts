export type CreditPromotionType =
  | "percentage_bonus"
  | "flat_bonus"
  | "multiplier";
export type CreditPromotionAppliesTo = "all" | "fixed_only" | string;

export interface CreditPromotion {
  id: string;
  name: string;
  description: string;
  type: CreditPromotionType;
  value: number;
  applies_to: CreditPromotionAppliesTo;
  active: boolean;
}

export interface PurchaseCreditsBreakdown {
  baseCredits: number;
  bonusCredits: number;
  totalCredits: number;
  promotion: CreditPromotion | null;
}

/** First active promotion where applies_to is "all". */
export function getActivePromotion(
  promotions: CreditPromotion[],
): CreditPromotion | null {
  return promotions.find((p) => p.active && p.applies_to === "all") ?? null;
}

function calculateBonusCredits(
  promotion: CreditPromotion,
  baseAmount: number,
): number {
  const base = Math.round(baseAmount);
  if (base <= 0) return 0;

  switch (promotion.type) {
    case "percentage_bonus":
      return Math.floor((base * promotion.value) / 100);
    default:
      return 0;
  }
}

export function calculatePurchaseCredits(
  baseAmount: number,
  promotions: CreditPromotion[],
): PurchaseCreditsBreakdown {
  const baseCredits = Math.round(baseAmount);
  const promotion = getActivePromotion(promotions);
  const bonusCredits = promotion
    ? calculateBonusCredits(promotion, baseCredits)
    : 0;

  return {
    baseCredits,
    bonusCredits,
    totalCredits: baseCredits + bonusCredits,
    promotion,
  };
}
