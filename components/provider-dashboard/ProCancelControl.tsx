'use client'

import { useState } from 'react'
import { cancelPurchasedProMembershipAction } from '@/lib/actions/pro-membership'

interface Props {
  periodEndLabel: string
  withinRefundWindow: boolean
  refundWindowHours: number
}

export function ProCancelControl({ periodEndLabel, withinRefundWindow, refundWindowHours }: Props) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
      >
        Cancel Pro
      </button>
    )
  }

  return (
    <form action={cancelPurchasedProMembershipAction} className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
      <p className="text-sm font-semibold text-foreground">Confirm Pro cancellation</p>
      {withinRefundWindow ? (
        <p className="mt-1 text-sm text-muted-foreground">
          You&apos;re within the {refundWindowHours}-hour refund window. Cancelling now ends Pro immediately and
          refunds the full purchase in credits to your provider wallet.
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          The {refundWindowHours}-hour refund window has passed, so this cancellation is not refunded. Your Pro
          features stay active until {periodEndLabel}. On that date your expanded gallery, unlimited listings,
          profile customisation, custom URL, and raised publishing limits stop.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground"
        >
          Confirm cancellation
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
        >
          Keep Pro
        </button>
      </div>
    </form>
  )
}
