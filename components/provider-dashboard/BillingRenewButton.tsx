'use client'

import { useState } from 'react'
import { PACKAGES } from '@/lib/pricing-config'
import type { ProviderSubscription } from '@/lib/db'

interface Props {
  subscription: ProviderSubscription | null
  providerEmail: string
}

export function BillingRenewButton({ subscription, providerEmail }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRenew() {
    if (!subscription) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/payments/subscription/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: subscription.id }),
      })
      const data = await res.json() as { authorization_url?: string; error?: string }
      if (!res.ok || !data.authorization_url) {
        setError(data.error ?? 'Could not start payment.')
        setLoading(false)
        return
      }
      window.location.href = data.authorization_url
    } catch {
      setError('Payment failed to start. Try again.')
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleRenew}
        disabled={loading || !subscription}
        className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? 'Redirecting…' : `Renew now — R${PACKAGES[0].monthlyFee}`}
      </button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <p className="mt-1 text-xs text-muted-foreground">Payment via Paystack · {providerEmail}</p>
    </div>
  )
}
