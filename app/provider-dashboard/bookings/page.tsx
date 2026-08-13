import Link from 'next/link'
import type { Metadata } from 'next'
import { requireProviderSession } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { BookingStatusBadge } from '@/components/customer-account/BookingStatusBadge'
import { bookingReference } from '@/lib/booking-detail'
import { formatCredits } from '@/lib/format-credits'
import { unreadBookingMessageCount } from '@/lib/actions/booking-messages'
import {
  OPEN_STATUSES,
  PROVIDER_ACTION_NEEDED,
  STATUS_FILTERS,
} from '@/lib/domain/booking-status'

export const metadata: Metadata = {
  title: 'Bookings',
  robots: { index: false, follow: false },
}

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function ProviderBookingsPage({ searchParams }: Props) {
  const { status: filter = 'all' } = await searchParams
  const { provider } = await requireProviderSession()

  const supabase = await createClient()

  let query = supabase
    .from('bookings')
    .select(
      `id, status, final_price, created_at, cancellation_reason,
       service:services!bookings_service_id_fkey(title),
       customer:customers!bookings_customer_id_fkey(name)`,
    )
    .eq('provider_id', provider.id)

  if (filter === 'open') {
    query = query.in('status', OPEN_STATUSES)
  } else if (filter !== 'all') {
    query = query.eq('status', filter)
  }

  const { data } = await query.order('created_at', { ascending: false }).limit(200)

  const bookings = data ?? []
  const unread = await unreadBookingMessageCount({
    viewerRole: 'provider',
    bookingIds: bookings.map((b) => b.id),
  })

  const one = <T,>(rel: T | T[] | null): T | null =>
    Array.isArray(rel) ? rel[0] ?? null : rel

  // Action-needed first, then newest.
  const sorted = [...bookings].sort((a, b) => {
    const aNeeds = PROVIDER_ACTION_NEEDED.includes(a.status) ? 0 : 1
    const bNeeds = PROVIDER_ACTION_NEEDED.includes(b.status) ? 0 : 1
    if (aNeeds !== bNeeds) return aNeeds - bNeeds
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-xl font-bold">Bookings</h1>

      <nav className="mt-5 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((option) => (
          <Link
            key={option.value}
            href={`/provider-dashboard/bookings?status=${option.value}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === option.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      {sorted.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          No bookings to show here yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {sorted.map((booking) => {
            const service = one(booking.service as { title: string } | { title: string }[])
            const customer = one(booking.customer as { name: string } | { name: string }[])
            const unreadCount = unread[booking.id] ?? 0

            return (
              <li key={booking.id}>
                <Link
                  href={`/provider-dashboard/bookings/${booking.id}`}
                  className="flex items-start justify-between gap-4 rounded-2xl border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{service?.title ?? 'Service'}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {customer?.name ?? 'Customer'} · {bookingReference(booking.id)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(booking.created_at).toLocaleDateString('en-ZA', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                    <BookingStatusBadge
                      status={booking.status}
                      cancellationReason={booking.cancellation_reason}
                    />
                    <span className="text-sm font-medium">
                      {formatCredits(Math.round(Number(booking.final_price)))}
                    </span>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
