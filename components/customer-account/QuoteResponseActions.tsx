'use client'

import { useState, useTransition } from 'react'
import type { DeclineIssuedQuoteResult } from '@/lib/actions/custom-quotes'

interface QuoteResponseActionsProps {
  quoteId: string
  acceptAction: (formData: FormData) => void
  declineAction: (formData: FormData) => Promise<DeclineIssuedQuoteResult>
}

export function QuoteResponseActions({
  quoteId,
  acceptAction,
  declineAction,
}: QuoteResponseActionsProps) {
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submitDecline(formData: FormData) {
    setMessage(null)
    formData.set('quoteId', quoteId)
    formData.set('declineReason', reason)

    startTransition(async () => {
      const result = await declineAction(formData)
      setMessage(result.ok ? 'Quote declined. The request is open again.' : result.error)
    })
  }

  return (
    <div className="space-y-4">
      <form action={acceptAction}>
        <input type="hidden" name="quoteId" value={quoteId} />
        <button
          type="submit"
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Accept and create booking
        </button>
      </form>

      <form action={submitDecline} className="space-y-2 border-t pt-4">
        <label className="block text-sm font-medium" htmlFor={`decline-${quoteId}`}>
          Decline reason
        </label>
        <textarea
          id={`decline-${quoteId}`}
          rows={2}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={isPending || !reason.trim()}
          className="rounded-lg border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Decline quote
        </button>
      </form>

      {message && (
        <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  )
}
