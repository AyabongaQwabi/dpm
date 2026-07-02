/** Display helper — 1 credit = R1. Use everywhere except the credit purchase screen. */
export function formatCredits(amount: number): string {
  return `${Math.round(amount).toLocaleString('en-ZA')} credits`
}

/** Purchase screen copy: shows both Rand and credit units. */
export function formatCreditPurchase(amount: number): string {
  const n = Math.round(amount)
  return `Pay R${n.toLocaleString('en-ZA')} → receive ${n.toLocaleString('en-ZA')} credits`
}

/** Purchase confirmation with optional bonus breakdown. */
export function formatCreditPurchaseWithBonus(
  baseCredits: number,
  bonusCredits: number,
  promotionName?: string | null,
): string {
  const base = Math.round(baseCredits)
  if (bonusCredits <= 0) {
    return `${base.toLocaleString('en-ZA')} credits purchased`
  }
  const bonus = Math.round(bonusCredits)
  const suffix = promotionName ? ` (${promotionName})` : ''
  return `${base.toLocaleString('en-ZA')} credits purchased + ${bonus.toLocaleString('en-ZA')} bonus credits${suffix}`
}
