'use client'

import { useMemo, useState, useTransition } from 'react'
import { formatCredits } from '@/lib/format-credits'
import type {
  DeclineQuoteRequestResult,
  IssueQuoteResult,
} from '@/lib/actions/custom-quotes'

interface LineItemDraft {
  id: string
  description: string
  quantity: string
  unitPrice: string
}

interface QuoteBuilderProps {
  quoteRequestId: string
  defaultValidityDate: string
  minLineItems: number
  maxLineItems: number
  issueAction: (formData: FormData) => Promise<IssueQuoteResult>
  declineAction: (formData: FormData) => Promise<DeclineQuoteRequestResult>
}

function newLineItem(): LineItemDraft {
  return {
    id: crypto.randomUUID(),
    description: '',
    quantity: '1',
    unitPrice: '',
  }
}

function toNumber(value: string): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export function QuoteBuilder({
  quoteRequestId,
  defaultValidityDate,
  minLineItems,
  maxLineItems,
  issueAction,
  declineAction,
}: QuoteBuilderProps) {
  const [items, setItems] = useState<LineItemDraft[]>([newLineItem()])
  const [validityDate, setValidityDate] = useState(defaultValidityDate)
  const [termsText, setTermsText] = useState('')
  const [declineReason, setDeclineReason] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const total = useMemo(
    () =>
      items.reduce((sum, item) => {
        const quantity = toNumber(item.quantity)
        const unitPrice = Math.round(toNumber(item.unitPrice))
        return sum + Math.max(0, Math.round(quantity * unitPrice))
      }, 0),
    [items],
  )

  function updateItem(id: string, patch: Partial<LineItemDraft>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )
  }

  function removeItem(id: string) {
    setItems((current) =>
      current.length <= minLineItems ? current : current.filter((item) => item.id !== id),
    )
  }

  function submitQuote(formData: FormData) {
    setMessage(null)
    formData.set('quoteRequestId', quoteRequestId)
    formData.set(
      'lineItemsJson',
      JSON.stringify(
        items.map((item) => ({
          description: item.description,
          quantity: toNumber(item.quantity),
          unitPrice: Math.round(toNumber(item.unitPrice)),
        })),
      ),
    )
    formData.set('validityDate', validityDate)
    formData.set('termsText', termsText)

    startTransition(async () => {
      const result = await issueAction(formData)
      setMessage(result.ok ? 'Quote sent.' : result.error)
    })
  }

  function submitDecline(formData: FormData) {
    setMessage(null)
    formData.set('quoteRequestId', quoteRequestId)
    formData.set('declineReason', declineReason)

    startTransition(async () => {
      const result = await declineAction(formData)
      setMessage(result.ok ? 'Request declined.' : result.error)
    })
  }

  return (
    <div className="space-y-5">
      <form action={submitQuote} className="space-y-4">
        <input type="hidden" name="quoteRequestId" value={quoteRequestId} />
        <input type="hidden" name="lineItemsJson" value="" />

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.id} className="rounded-lg border bg-background p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Line {index + 1}
                </p>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  disabled={items.length <= minLineItems}
                  className="text-xs text-muted-foreground hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_96px_132px]">
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium">Description</span>
                  <input
                    type="text"
                    required
                    value={item.description}
                    onChange={(event) => updateItem(item.id, { description: event.target.value })}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium">Qty</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={item.quantity}
                    onChange={(event) => updateItem(item.id, { quantity: event.target.value })}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium">Unit price</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={item.unitPrice}
                    onChange={(event) => updateItem(item.id, { unitPrice: event.target.value })}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={items.length >= maxLineItems}
            onClick={() => setItems((current) => [...current, newLineItem()])}
            className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add line item
          </button>
          <p className="text-lg font-semibold tabular-nums">
            Total {formatCredits(total)}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Valid until</span>
            <input
              type="date"
              required
              value={validityDate}
              onChange={(event) => setValidityDate(event.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Terms</span>
            <textarea
              rows={3}
              value={termsText}
              onChange={(event) => setTermsText(event.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Sending...' : 'Send quote'}
        </button>
      </form>

      <form action={submitDecline} className="border-t pt-4">
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Decline reason</span>
          <textarea
            rows={2}
            value={declineReason}
            onChange={(event) => setDeclineReason(event.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <button
          type="submit"
          disabled={isPending || !declineReason.trim()}
          className="mt-3 rounded-lg border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Decline request
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
