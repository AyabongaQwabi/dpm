import Link from 'next/link'
import { requireCustomerSession } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { Avatar } from '@/components/ui/Avatar'
import { BookingStatusBadge } from '@/components/customer-account/BookingStatusBadge'
import { cancelBooking, confirmCompletion } from '@/lib/actions/customer'
import { formatCredits } from '@/lib/format-credits'
import {
  CUSTOMER_CANCELLABLE,
  OPEN_STATUSES,
  effectiveStatus,
} from '@/lib/domain/booking-status'
import type { BookingStatus } from '@/lib/domain/booking'

interface Props {
  searchParams: Promise<{ filter?: string }>
}

type Filter = 'active' | 'completed' | 'closed' | 'all'

const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  active: 'Active',
  completed: 'Completed',
  closed: 'Cancelled / Declined',
}

export default async function MyBookingsPage({ searchParams }: Props) {
  const { filter: rawFilter } = await searchParams
  const filter: Filter = (['active', 'completed', 'closed', 'all'] as Filter[]).includes(rawFilter as Filter)
    ? (rawFilter as Filter)
    : 'all'

  const { customer } = await requireCustomerSession()
  const supabase = await createClient()

  const { data: rawBookings } = await supabase
    .from('bookings')
    .select(`
      id, status, final_price, requested_at, updated_at, cancellation_reason,
      service:services!bookings_service_id_fkey(id, title),
      provider:providers!bookings_provider_id_fkey(id, business_name, slug, profile_image),
      service_package:service_packages!bookings_package_id_fkey(id, name),
      reviews(id),
      message_threads(id)
    `)
    .eq('customer_id', customer.id)
    .order('requested_at', { ascending: false })
    .limit(100)

  type RawBooking = {
    id: string; status: string; final_price: number
    requested_at: string; updated_at: string; cancellation_reason: string | null
    service: { id: string; title: string } | { id: string; title: string }[] | null
    provider: { id: string; business_name: string; slug: string | null; profile_image: string | null } | null | { id: string; business_name: string; slug: string | null; profile_image: string | null }[]
    service_package: { id: string; name: string } | { id: string; name: string }[] | null
    reviews: { id: string }[] | null
    message_threads: { id: string }[] | null
  }

  function first<T>(v: T | T[] | null | undefined): T | null {
    if (!v) return null
    return Array.isArray(v) ? (v[0] ?? null) : v
  }

  const all = ((rawBookings ?? []) as unknown as RawBooking[]).map((b) => ({
    ...b,
    service: first(b.service),
    provider: first(b.provider),
    service_package: first(b.service_package),
    reviews: b.reviews ?? [],
    message_threads: b.message_threads ?? [],
  }))

  const filtered = all.filter((b) => {
    if (filter === 'active') return OPEN_STATUSES.includes(b.status as BookingStatus)
    if (filter === 'completed') return b.status === 'completed'
    if (filter === 'closed') return ['cancelled', 'declined'].includes(b.status)
    return true
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">My Bookings</h1>
        <p className="text-muted-foreground text-sm mt-1">Your complete booking history across all services.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 border-b pb-0">
        {(Object.entries(FILTER_LABELS) as [Filter, string][]).map(([key, label]) => (
          <Link
            key={key}
            href={`/customer-account/bookings?filter=${key}`}
            className={[
              'px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors cursor-pointer',
              filter === key
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
            ].join(' ')}
          >
            {label}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">
            {filter === 'all' ? 'No bookings yet.' : `No ${FILTER_LABELS[filter].toLowerCase()} bookings.`}
          </p>
          <Link
            href="/services"
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
          >
            Browse services
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((booking) => {
            const canCancel = CUSTOMER_CANCELLABLE.includes(booking.status as BookingStatus)
            // The customer confirms only after the provider says the work is done.
            const canConfirm = booking.status === 'completed_by_provider' || booking.status === 'disputed'
            const canReview = booking.status === 'completed' && booking.reviews.length === 0
            const isDispute =
              effectiveStatus(booking.status as BookingStatus, booking.cancellation_reason) === 'disputed'
            const threadId = booking.message_threads[0]?.id ?? null

            return (
              <article
                key={booking.id}
                className="rounded-2xl border bg-card overflow-hidden hover:shadow-sm transition-shadow"
              >
                {/* Main row */}
                <div className="flex items-start gap-4 px-5 py-4">
                  <Avatar
                    src={booking.provider?.profile_image ?? null}
                    alt={booking.provider?.business_name ?? 'Provider'}
                    size="md"
                    shape="rounded"
                    className="flex-shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/customer-account/bookings/${booking.id}`}
                          className="font-semibold text-sm leading-snug hover:underline"
                        >
                          {booking.service?.title ?? 'Service'}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {booking.provider?.business_name}
                          {booking.service_package ? ` · ${booking.service_package.name} package` : ''}
                        </p>
                      </div>
                      <BookingStatusBadge status={booking.status} cancellationReason={booking.cancellation_reason} />
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Requested {new Date(booking.requested_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      {booking.status === 'completed' && (
                        <span>
                          Completed {new Date(booking.updated_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                      <span className="font-medium text-foreground">{formatCredits(Number(booking.final_price))}</span>
                    </div>
                  </div>
                </div>

                {/* Actions bar */}
                <div className="border-t border-border bg-muted/30 px-5 py-3 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/customer-account/bookings/${booking.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline cursor-pointer"
                  >
                    View booking
                  </Link>
                  {(canConfirm || canCancel || canReview || threadId || isDispute) && (
                  <>
                    {threadId && (
                      <Link
                        href={`/customer-account/messages/${threadId}`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline cursor-pointer"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        Messages
                      </Link>
                    )}

                    {canReview && (
                      <Link
                        href={`/customer-account/reviews?leave=${booking.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary-accent px-3 py-1.5 text-xs font-semibold text-primary-accent-foreground hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        Leave a review
                      </Link>
                    )}

                    {canConfirm && (
                      <form action={confirmCompletion}>
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity cursor-pointer"
                        >
                          Confirm completion
                        </button>
                      </form>
                    )}

                    {canConfirm && (
                      // Raising an issue needs a reason, which does not fit a
                      // list row — the detail page carries the full form.
                      <Link
                        href={`/customer-account/bookings/${booking.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100 transition-colors cursor-pointer"
                      >
                        Raise an issue
                      </Link>
                    )}

                    {canCancel && (
                      <form action={cancelBooking} className="ml-auto">
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <input type="hidden" name="reason" value="Cancelled by customer" />
                        <button
                          type="submit"
                          className="text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                        >
                          Cancel request
                        </button>
                      </form>
                    )}

                    {isDispute && (
                      <span className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5">
                        Issue raised — our team will be in touch.
                      </span>
                    )}
                  </>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
