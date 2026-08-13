import type { Metadata } from 'next'
import { requireProviderSession } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { formatCredits } from '@/lib/format-credits'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { QuoteBuilder } from '@/components/provider-dashboard/QuoteBuilder'
import { declineQuoteRequest, issueCustomQuote } from '@/lib/actions/custom-quotes'
import {
  CUSTOM_QUOTE_MAX_LINE_ITEMS,
  CUSTOM_QUOTE_MIN_LINE_ITEMS,
  CUSTOM_QUOTE_VALIDITY_DAYS,
} from '@/lib/platform-config'
import { defaultQuoteValidityDate, type QuoteLineItem } from '@/lib/domain/custom-quotes'

export const metadata: Metadata = {
  title: 'Custom Quotes',
  robots: { index: false, follow: false },
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function statusTone(status: string): string {
  if (status === 'quoted') return 'bg-blue-100 text-blue-700 border-blue-200'
  if (status === 'accepted') return 'bg-green-100 text-green-700 border-green-200'
  if (status === 'declined') return 'bg-red-100 text-red-700 border-red-200'
  if (status === 'expired') return 'bg-muted text-muted-foreground'
  return 'bg-amber-100 text-amber-700 border-amber-200'
}

export default async function ProviderQuotesPage() {
  const { provider } = await requireProviderSession()
  const supabase = await createClient()

  const { data } = await supabase
    .from('quote_requests')
    .select(`
      id,
      description,
      status,
      decline_reason,
      created_at,
      customer:customers!quote_requests_customer_id_fkey(id, name, email),
      service:services!quote_requests_service_id_fkey(id, title, accepts_custom_quotes),
      quotes:quotes!quotes_quote_request_id_fkey(
        id,
        status,
        total_amount,
        validity_date,
        line_items,
        created_at
      )
    `)
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const requests = (data ?? []) as Array<{
    id: string
    description: string
    status: string
    decline_reason: string | null
    created_at: string
    customer: { id: string; name: string; email: string } | { id: string; name: string; email: string }[] | null
    service: { id: string; title: string; accepts_custom_quotes: boolean } | { id: string; title: string; accepts_custom_quotes: boolean }[] | null
    quotes: Array<{
      id: string
      status: string
      total_amount: number
      validity_date: string
      line_items: QuoteLineItem[]
      created_at: string
    }> | null
  }>

  const defaultValidityDate = defaultQuoteValidityDate(CUSTOM_QUOTE_VALIDITY_DAYS)

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Custom Quotes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review customer requests and respond with structured line-item quotes.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">No custom quote requests yet.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {requests.map((request) => {
            const customer = first(request.customer)
            const service = first(request.service)
            const quotes = [...(request.quotes ?? [])].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            )
            const activeQuote = quotes.find((quote) => quote.status === 'sent') ?? null
            const open = request.status === 'requested' || request.status === 'quoted'

            return (
              <Card key={request.id}>
                <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">
                        {service?.title ?? 'Custom quote request'}
                      </CardTitle>
                      <Badge className={statusTone(request.status)}>{request.status}</Badge>
                    </div>
                    <CardDescription className="mt-1">
                      {customer?.name ?? 'Customer'} ·{' '}
                      {new Date(request.created_at).toLocaleDateString('en-ZA', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </CardDescription>
                  </div>
                  {activeQuote && (
                    <div className="rounded-lg border bg-muted/30 px-3 py-2 text-right">
                      <p className="text-xs text-muted-foreground">Active quote</p>
                      <p className="font-semibold tabular-nums">
                        {formatCredits(Number(activeQuote.total_amount))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        valid until {new Date(activeQuote.validity_date).toLocaleDateString('en-ZA')}
                      </p>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
                  <div className="space-y-4">
                    <section className="rounded-lg border bg-muted/30 p-4">
                      <h2 className="text-sm font-semibold">Customer description</h2>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {request.description}
                      </p>
                    </section>

                    {request.decline_reason && (
                      <section className="rounded-lg border border-red-200 bg-red-50 p-4">
                        <h2 className="text-sm font-semibold text-red-800">Decline reason</h2>
                        <p className="mt-2 text-sm leading-6 text-red-700">{request.decline_reason}</p>
                      </section>
                    )}

                    {quotes.length > 0 && (
                      <section>
                        <h2 className="text-sm font-semibold">Quote history</h2>
                        <ul className="mt-2 space-y-2">
                          {quotes.map((quote) => (
                            <li
                              key={quote.id}
                              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                            >
                              <span className="text-muted-foreground">
                                {quote.status} · {quote.line_items.length} line
                                {quote.line_items.length === 1 ? '' : 's'}
                              </span>
                              <span className="font-medium tabular-nums">
                                {formatCredits(Number(quote.total_amount))}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}
                  </div>

                  {open ? (
                    <QuoteBuilder
                      quoteRequestId={request.id}
                      defaultValidityDate={defaultValidityDate}
                      minLineItems={CUSTOM_QUOTE_MIN_LINE_ITEMS}
                      maxLineItems={CUSTOM_QUOTE_MAX_LINE_ITEMS}
                      issueAction={issueCustomQuote}
                      declineAction={declineQuoteRequest}
                    />
                  ) : (
                    <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                      This request is closed.
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
