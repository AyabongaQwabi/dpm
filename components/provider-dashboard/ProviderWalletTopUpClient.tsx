'use client'

import { useState, useTransition } from 'react'
import { PausedFeatureNotice } from '@/components/PausedFeatureNotice'

interface Props {
  presets: number[]
  minAmount: number
  maxAmount: number
  initialAmount?: number
  purchasesPaused: boolean
  purchasesPausedMessage: string
}

export function ProviderWalletTopUpClient({
  presets,
  minAmount,
  maxAmount,
  initialAmount,
  purchasesPaused,
  purchasesPausedMessage,
}: Props) {
  const [amount, setAmount] = useState(initialAmount ?? presets[0] ?? minAmount)
  const [error, setError] = useState<string | null>(null)
  const [showPausedNotice, setShowPausedNotice] = useState(false)
  const [isPending, startTransition] = useTransition()

  function beginTopUp(nextAmount: number) {
    if (purchasesPaused) {
      setShowPausedNotice(true)
      return
    }

    const rounded = Math.round(nextAmount)
    if (!Number.isFinite(rounded) || rounded < minAmount || rounded > maxAmount) {
      setError(`Enter an amount between ${minAmount} and ${maxAmount} credits`)
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/payments/provider-wallet/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: rounded }),
        })
        const data = await res.json() as { redirect_url?: string; error?: string }
        if (!res.ok || !data.redirect_url) {
          setError(data.error ?? 'Top-up could not be started')
          return
        }
        window.location.href = data.redirect_url
      } catch {
        setError('Network error — please try again')
      }
    })
  }

  return (
    <div className="space-y-5">
      {showPausedNotice && <PausedFeatureNotice message={purchasesPausedMessage} />}

      <div>
        <h2 className="text-sm font-semibold text-foreground">Quick top-up</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={isPending}
              onClick={() => beginTopUp(preset)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              R{preset}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <label htmlFor="providerWalletAmount" className="text-sm font-medium text-foreground">
          Custom amount
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="providerWalletAmount"
            type="number"
            inputMode="numeric"
            min={minAmount}
            max={maxAmount}
            step={1}
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
            className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={isPending}
            onClick={() => beginTopUp(amount)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Starting...' : 'Top up'}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Min R{minAmount.toLocaleString('en-ZA')} · Max R{maxAmount.toLocaleString('en-ZA')}
        </p>
      </div>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  )
}
