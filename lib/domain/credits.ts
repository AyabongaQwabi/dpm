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
