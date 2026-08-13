import type { Metadata } from 'next'
import { requireCustomerSession } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatCredits } from '@/lib/format-credits'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { QuoteResponseActions } from '@/components/customer-account/QuoteResponseActions'
import { acceptCustomQuote, declineIssuedQuote } from '@/lib/actions/custom-quotes'
import type { QuoteLineItem } from '@/lib/domain/custom-quotes'

export const metadata: Metadata = {
  title: 'Quotes',
  robots: { index: false, follow: false },
}

interface Props {
  searchParams: Promise<{ expired?: string; error?: string }>
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

function isPastValidityDate(validityDate: string): boolean {
  const today = new Date().toISOString().slice(0, 10)
  return validityDate < today
}

export default async function CustomerQuotesPage({ searchParams }: Props) {
  const params = await searchParams
  const { customer } = await requireCustomerSession()
  const supabase = await createClient()

  const { data } = await supabase
    .from('quote_requests')
    .select(`
      id,
      description,
      status,
      decline_reason,
      created_at,
      provider:providers!quote_requests_provider_id_fkey(id, business_name, slug, profile_image),
      service:services!quote_requests_service_id_fkey(id, title),
      quotes:quotes!quotes_quote_request_id_fkey(
        id,
        status,
        total_amount,
        validity_date,
        terms_text,
        decline_reason,
        line_items,
        booking_id,
        created_at
      )
    `)
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const requests = (data ?? []) as Array<{
    id: string
    description: string
    status: string
    decline_reason: string | null
    created_at: string
    provider: { id: string; business_name: string; slug: string | null; profile_image: string | null } | { id: string; business_name: string; slug: string | null; profile_image: string | null }[] | null
    service: { id: string; title: string } | { id: string; title: string }[] | null
    quotes: Array<{
      id: string
      status: string
      total_amount: number
      validity_date: string
      terms_text: string
      decline_reason: string | null
      line_items: QuoteLineItem[]
      booking_id: string | null
      created_at: string
    }> | null
  }>

  const expiringQuoteIds: string[] = []
  const expiringRequestIds: string[] = []
  for (const request of requests) {
    const sentQuote = (request.quotes ?? []).find((quote) => quote.status === 'sent')
    if (sentQuote && isPastValidityDate(sentQuote.validity_date)) {
      expiringQuoteIds.push(sentQuote.id)
      expiringRequestIds.push(request.id)
      sentQuote.status = 'expired'
      if (request.status === 'quoted') request.status = 'expired'
    }
  }

  if (expiringQuoteIds.length > 0) {
    const admin = createAdminClient()
    await admin.from('quotes').update({ status: 'expired' }).in('id', expiringQuoteIds)
    await admin
      .from('quote_requests')
      .update({ status: 'expired' })
      .in('id', expiringRequestIds)
      .eq('status', 'quoted')
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Quotes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review custom quotes from providers and accept one to create a booking.
        </p>
      </div>

      {params.expired && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          That quote has expired and can no longer be accepted.
        </p>
      )}
      {params.error === 'booking' && (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          The booking could not be created. Please try again.
        </p>
      )}

      {requests.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">No quote requests yet.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {requests.map((request) => {
            const provider = first(request.provider)
            const service = first(request.service)
            const quotes = [...(request.quotes ?? [])].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            )
            const activeQuote = quotes.find((quote) => quote.status === 'sent') ?? null

            return (
              <Card key={request.id} id={request.id}>
                <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">
                        {service?.title ?? 'Custom quote'}
                      </CardTitle>
                      <Badge className={statusTone(request.status)}>{request.status}</Badge>
                    </div>
                    <CardDescription className="mt-1">
                      {provider?.business_name ?? 'Provider'} · requested{' '}
                      {new Date(request.created_at).toLocaleDateString('en-ZA', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </CardDescription>
                  </div>
                  {activeQuote && (
                    <div className="rounded-lg border bg-muted/30 px-3 py-2 text-right">
                      <p className="text-xs text-muted-foreground">Quote total</p>
                      <p className="font-semibold tabular-nums">
                        {formatCredits(Number(activeQuote.total_amount))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        valid until {new Date(activeQuote.validity_date).toLocaleDateString('en-ZA')}
                      </p>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="space-y-4">
                    <section className="rounded-lg border bg-muted/30 p-4">
                      <h2 className="text-sm font-semibold">Your request</h2>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {request.description}
                      </p>
                    </section>

                    {activeQuote ? (
                      <section>
                        <h2 className="text-sm font-semibold">Quote line items</h2>
                        <ul className="mt-2 divide-y rounded-lg border">
                          {activeQuote.line_items.map((item, index) => (
                            <li key={`${item.description}-${index}`} className="grid gap-2 px-3 py-2 text-sm sm:grid-cols-[1fr_auto]">
                              <span>{item.description}</span>
                              <span className="font-medium tabular-nums">
                                {item.quantity} × {formatCredits(Number(item.unit_price))} = {formatCredits(Number(item.line_total))}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {activeQuote.terms_text && (
                          <p className="mt-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                            {activeQuote.terms_text}
                          </p>
                        )}
                      </section>
                    ) : request.decline_reason ? (
                      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <h2 className="text-sm font-semibold text-amber-900">Provider response</h2>
                        <p className="mt-2 text-sm text-amber-800">{request.decline_reason}</p>
                      </section>
                    ) : null}
                  </div>

                  {activeQuote ? (
                    <QuoteResponseActions
                      quoteId={activeQuote.id}
                      acceptAction={acceptCustomQuote}
                      declineAction={declineIssuedQuote}
                    />
                  ) : (
                    <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                      {request.status === 'requested'
                        ? 'The provider can send a revised quote from their dashboard.'
                        : 'There is no active quote to respond to.'}
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
