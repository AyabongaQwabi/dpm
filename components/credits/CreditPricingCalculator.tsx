'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  calculatePurchaseCredits,
  type CreditPromotion,
} from '@/lib/domain/credit-promotions'
import { formatCredits } from '@/lib/format-credits'

interface Props {
  minAmount: number
  maxAmount: number
  activePromotion: CreditPromotion | null
  isAuthenticated: boolean
  walletPath?: string
  signInPath?: string
  onBuy?: (amount: number) => void
  disabled?: boolean
}

export function CreditPricingCalculator({
  minAmount,
  maxAmount,
  activePromotion,
  isAuthenticated,
  walletPath = '/customer-account/credits',
  signInPath = '/sign-in',
  onBuy,
  disabled = false,
}: Props) {
  const [amountInput, setAmountInput] = useState('')
  const promotions = activePromotion ? [activePromotion] : []

  const parsedAmount = Math.round(Number(amountInput))
  const isValid = Number.isFinite(parsedAmount)
    && parsedAmount >= minAmount
    && parsedAmount <= maxAmount

  const preview = useMemo(() => {
    if (!isValid) return null
    return calculatePurchaseCredits(parsedAmount, promotions)
  }, [isValid, parsedAmount, promotions])

  function buyHref(amount: number): string {
    const next = `${walletPath}?amount=${amount}`
    return isAuthenticated ? next : `${signInPath}?next=${encodeURIComponent(next)}`
  }

  return (
    <div className="rounded-2xl border bg-card p-6">
      <h3 className="text-base font-semibold">Custom amount</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter any amount between R{minAmount.toLocaleString('en-ZA')} and R{maxAmount.toLocaleString('en-ZA')}.
      </p>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex-1">
          <label htmlFor="creditAmount" className="sr-only">Amount in Rands</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R</span>
            <input
              id="creditAmount"
              type="number"
              min={minAmount}
              max={maxAmount}
              step={1}
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder={String(minAmount)}
              className="w-full rounded-xl border border-input bg-background py-3 pl-9 pr-4 text-sm"
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            1 credit = R1 · Min {minAmount} · Max {maxAmount.toLocaleString('en-ZA')}
          </p>
        </div>

        {preview && (
          <div className="flex-1 rounded-xl bg-muted/40 px-4 py-3 text-sm">
            <p>{preview.baseCredits.toLocaleString('en-ZA')} base credits</p>
            {preview.bonusCredits > 0 && preview.promotion && (
              <p className="mt-1 text-primary-accent font-medium">
                +{preview.bonusCredits.toLocaleString('en-ZA')} bonus ({preview.promotion.name})
              </p>
            )}
            <p className="mt-2 font-semibold">
              Total: {formatCredits(preview.totalCredits)}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4">
        {onBuy ? (
          <button
            type="button"
            disabled={!isValid || disabled}
            onClick={() => isValid && onBuy(parsedAmount)}
            className="rounded-xl bg-primary-accent px-6 py-3 text-sm font-semibold text-primary-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Buy now
          </button>
        ) : (
          <Link
            href={isValid ? buyHref(parsedAmount) : '#'}
            aria-disabled={!isValid}
            className={[
              'inline-flex rounded-xl bg-primary-accent px-6 py-3 text-sm font-semibold text-primary-accent-foreground transition-opacity hover:opacity-90',
              !isValid ? 'pointer-events-none opacity-50' : '',
            ].join(' ')}
          >
            Buy now
          </Link>
        )}
      </div>
    </div>
  )
}
