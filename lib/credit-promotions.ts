import { readFileSync } from 'fs'
import { join } from 'path'
import {
  calculatePurchaseCredits as calculateBreakdown,
  getActivePromotion as pickActivePromotion,
  type CreditPromotion,
  type PurchaseCreditsBreakdown,
} from '@/lib/domain/credit-promotions'

export type { CreditPromotion, PurchaseCreditsBreakdown }

interface CreditPromotionsFile {
  promotions: CreditPromotion[]
}

const CONFIG_PATH = join(process.cwd(), 'config', 'credit-promotions.json')

function readPromotionsFile(): CreditPromotionsFile {
  const raw = readFileSync(CONFIG_PATH, 'utf8')
  return JSON.parse(raw) as CreditPromotionsFile
}

/** Runtime read — toggling active in JSON works without redeploy. */
export function loadCreditPromotions(): CreditPromotion[] {
  return readPromotionsFile().promotions
}

export function getActivePromotion(): CreditPromotion | null {
  return pickActivePromotion(loadCreditPromotions())
}

export function getPromotionById(id: string): CreditPromotion | null {
  return loadCreditPromotions().find((p) => p.id === id) ?? null
}

export function calculatePurchaseCredits(baseAmount: number): PurchaseCreditsBreakdown {
  return calculateBreakdown(baseAmount, loadCreditPromotions())
}
