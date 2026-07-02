'use client'

import { useState, useTransition } from 'react'
import { calculatePurchaseCredits, type CreditPromotion } from '@/lib/domain/credit-promotions'
import { CreditPackCards, CreditPurchaseConfirmation } from '@/components/credits/CreditPackCards'
import { CreditPricingCalculator } from '@/components/credits/CreditPricingCalculator'

interface Props {
  packs: number[]
  minAmount: number
  maxAmount: number
  initialAmount?: number
  activePromotion: CreditPromotion | null
}

export function CreditPurchaseClient({
  packs,
  minAmount,
  maxAmount,
  initialAmount,
  activePromotion,
}: Props) {
  const [pendingAmount, setPendingAmount] = useState<number | null>(
    initialAmount ? Math.max(minAmount, Math.min(maxAmount, initialAmount)) : null,
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const promotions = activePromotion ? [activePromotion] : []
  const preview = pendingAmount !== null
    ? calculatePurchaseCredits(pendingAmount, promotions)
    : null

  async function executePurchase(amount: number) {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/payments/credits/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount }),
        })
        const data = await res.json() as { authorization_url?: string; error?: string }
        if (!res.ok || !data.authorization_url) {
          setError(data.error ?? 'Payment could not be started')
          return
        }
        window.location.href = data.authorization_url
      } catch {
        setError('Network error — please try again')
      }
    })
  }

  function requestPurchase(amount: number) {
    if (!Number.isFinite(amount) || amount < minAmount || amount > maxAmount) {
      setError(`Enter an amount between ${minAmount} and ${maxAmount} credits`)
      return
    }
    setError(null)
    setPendingAmount(Math.round(amount))
  }

  return (
    <div className="space-y-8">
      {preview && (
        <CreditPurchaseConfirmation
          baseCredits={preview.baseCredits}
          bonusCredits={preview.bonusCredits}
          promotionName={preview.promotion?.name ?? null}
          isPending={isPending}
          onConfirm={() => void executePurchase(preview.baseCredits)}
          onCancel={() => setPendingAmount(null)}
        />
      )}

      {!preview && (
        <>
          <div>
            <h2 className="text-sm font-semibold mb-3">Quick top-up packs</h2>
            <CreditPackCards
              packs={packs}
              activePromotion={activePromotion}
              isAuthenticated
              onBuy={requestPurchase}
              disabled={isPending}
            />
          </div>

          <div>
            <h2 className="text-sm font-semibold mb-3">Custom amount</h2>
            <CreditPricingCalculator
              minAmount={minAmount}
              maxAmount={maxAmount}
              activePromotion={activePromotion}
              isAuthenticated
              onBuy={requestPurchase}
              disabled={isPending}
            />
          </div>
        </>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      )}
    </div>
  )
}
