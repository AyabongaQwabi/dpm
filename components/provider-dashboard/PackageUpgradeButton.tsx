'use client'

import { useState } from 'react'
import { PausedFeatureNotice } from '@/components/PausedFeatureNotice'

interface Props {
  packageNumber: 2 | 3 | 4 | 5
  monthlyFee: number
  returnPath: string
  purchasesPaused: boolean
  purchasesPausedMessage: string
  label?: string
  className?: string
}

export function PackageUpgradeButton({
  packageNumber,
  monthlyFee,
  returnPath,
  purchasesPaused,
  purchasesPausedMessage,
  label,
  className,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPausedNotice, setShowPausedNotice] = useState(false)

  async function handleUpgrade() {
    if (purchasesPaused) {
      setShowPausedNotice(true)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/payments/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageNumber, returnPath }),
      })
      const data = await res.json() as { redirect_url?: string; error?: string }
      if (!res.ok || !data.redirect_url) {
        setError(data.error ?? 'Could not start payment.')
        setLoading(false)
        return
      }
      window.location.href = data.redirect_url
    } catch {
      setError('Payment failed to start. Try again.')
      setLoading(false)
    }
  }

  return (
    <div>
      {showPausedNotice && <PausedFeatureNotice message={purchasesPausedMessage} />}
      <button
        type="button"
        onClick={handleUpgrade}
        disabled={loading}
        className={className ?? 'w-full rounded-lg bg-primary-accent px-4 py-2.5 text-sm font-semibold text-primary-accent-foreground hover:opacity-90 disabled:opacity-50'}
      >
        {loading ? 'Redirecting…' : label ?? `Choose this plan — R${monthlyFee}/mo`}
      </button>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  )
}
