'use client'

import Link from 'next/link'
import {
  calculatePurchaseCredits,
  type CreditPromotion,
} from '@/lib/domain/credit-promotions'
import { formatCredits, formatCreditPurchaseWithBonus } from '@/lib/format-credits'

interface Props {
  packs: number[]
  activePromotion: CreditPromotion | null
  isAuthenticated: boolean
  /** Wallet page path when user is signed in */
  walletPath?: string
  signInPath?: string
  /** When set, Buy triggers inline purchase flow instead of navigation */
  onBuy?: (amount: number) => void
  disabled?: boolean
}

export function CreditPackCards({
  packs,
  activePromotion,
  isAuthenticated,
  walletPath = '/customer-account/credits',
  signInPath = '/sign-in',
  onBuy,
  disabled = false,
}: Props) {
  const promotions = activePromotion ? [activePromotion] : []

  function buyHref(amount: number): string {
    const next = `${walletPath}?amount=${amount}`
    return isAuthenticated ? next : `${signInPath}?next=${encodeURIComponent(next)}`
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {packs.map((pack) => {
        const { baseCredits, bonusCredits, totalCredits, promotion } = calculatePurchaseCredits(
          pack,
          promotions,
        )

        return (
          <div
            key={pack}
            className="flex flex-col rounded-2xl border bg-card p-5"
          >
            <p className="text-lg font-bold">Pay R{baseCredits.toLocaleString('en-ZA')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {baseCredits.toLocaleString('en-ZA')} credits
            </p>
            {bonusCredits > 0 && promotion && (
              <p className="mt-2 text-sm font-medium text-primary-accent">
                +{bonusCredits.toLocaleString('en-ZA')} bonus credits
              </p>
            )}
            {promotion && bonusCredits > 0 && (
              <p className="text-xs text-muted-foreground">{promotion.name}</p>
            )}
            <p className="mt-3 text-sm font-semibold">
              Get {formatCredits(totalCredits)}
            </p>
            <div className="mt-auto pt-4">
              {onBuy ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onBuy(pack)}
                  className="block w-full rounded-xl bg-primary-accent px-4 py-2.5 text-center text-sm font-semibold text-primary-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  Buy now
                </button>
              ) : (
                <Link
                  href={buyHref(pack)}
                  className="block w-full rounded-xl bg-primary-accent px-4 py-2.5 text-center text-sm font-semibold text-primary-accent-foreground transition-opacity hover:opacity-90"
                >
                  Buy now
                </Link>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function CreditPurchaseConfirmation({
  baseCredits,
  bonusCredits,
  promotionName,
  onConfirm,
  onCancel,
  isPending,
  confirmLabel = 'Confirm & pay',
}: {
  baseCredits: number
  bonusCredits: number
  promotionName: string | null
  onConfirm: () => void
  onCancel: () => void
  isPending?: boolean
  confirmLabel?: string
}) {
  const totalCredits = baseCredits + bonusCredits

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
      <p className="text-sm font-semibold">Confirm your purchase</p>
      <p className="text-sm text-muted-foreground">
        {formatCreditPurchaseWithBonus(baseCredits, bonusCredits, promotionName)}
      </p>
      <p className="text-base font-bold">Total: {formatCredits(totalCredits)}</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={onConfirm}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Redirecting…' : confirmLabel}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onCancel}
          className="rounded-xl border px-5 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
