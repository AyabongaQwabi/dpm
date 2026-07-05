/** Pure credit wallet helpers — no database access. */

export function canAfford(balance: number, price: number): boolean {
  return balance >= Math.round(price)
}

export function shortfall(balance: number, price: number): number {
  const needed = Math.round(price)
  return Math.max(0, needed - balance)
}

export function assertPositiveCredits(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RangeError(`Credit amount must be a positive number, got ${amount}`)
  }
}

export type CreditPurchaseMetadata = {
  type?: string
  customer_id?: string
  credit_amount?: number | string
  bonus_credits?: number | string
  promotion_id?: string | null
}

/** Parse Paystack credit-purchase metadata into whole credit amounts. */
export function parseCreditPurchaseMetadata(metadata: CreditPurchaseMetadata) {
  const baseCredits = Math.round(Number(metadata.credit_amount))
  const bonusCredits = Math.round(Number(metadata.bonus_credits ?? 0))
  return { baseCredits, bonusCredits, totalCredits: baseCredits + bonusCredits }
}

/** Validate a Paystack verify response for applying credits to a customer wallet. */
export function isValidCreditPurchaseVerification(
  paystackStatus: string,
  metadata: CreditPurchaseMetadata,
  customerId: string,
): boolean {
  if (paystackStatus !== 'success') return false
  if (metadata.type !== 'credit_purchase') return false
  if (metadata.customer_id !== customerId) return false

  const { baseCredits } = parseCreditPurchaseMetadata(metadata)
  return Number.isFinite(baseCredits) && baseCredits > 0
}
