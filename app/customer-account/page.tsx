import Link from 'next/link'
import { requireCustomerSession } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { Avatar } from '@/components/ui/Avatar'
import { BookingStatusBadge } from '@/components/customer-account/BookingStatusBadge'
import { getPublishedProviders } from '@/lib/public-data'

const ACTIVE_STATUSES = ['requested', 'accepted']
const STALE_REQUEST_HOURS = 24

export default async function CustomerOverviewPage() {
  const { customer } = await requireCustomerSession()
  const supabase = await createClient()

  const [{ data: rawBookings }, featuredProviders] = await Promise.all([
    supabase
      .from('bookings')
      .select(`
        id, status, final_price, requested_at, updated_at, cancellation_reason,
        service:services(id, title),
        provider:providers(id, business_name, slug, profile_image),
        service_package:service_packages(name),
        reviews(id)
      `)
      .eq('customer_id', customer.id)
      .order('requested_at', { ascending: false })
      .limit(60),
    getPublishedProviders(supabase, { featured: true, limit: 4 }),
  ])

  type RawBooking = {
    id: string; status: string; final_price: number
    requested_at: string; updated_at: string; cancellation_reason: string | null
    service: { id: string; title: string } | { id: string; title: string }[] | null
    provider: { id: string; business_name: string; slug: string | null; profile_image: string | null } | { id: string; business_name: string; slug: string | null; profile_image: string | null }[] | null
    service_package: { name: string } | { name: string }[] | null
    reviews: { id: string }[] | null
  }

  function first<T>(v: T | T[] | null | undefined): T | null {
    if (!v) return null
    return Array.isArray(v) ? (v[0] ?? null) : v
  }

  const bookings = ((rawBookings ?? []) as unknown as RawBooking[]).map((b) => ({
    ...b,
    service: first(b.service),
    provider: first(b.provider),
    service_package: first(b.service_package),
    reviews: b.reviews ?? [],
  }))

  const now = Date.now()
  const activeBookings = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status))

  // Pending actions
  const needsReview = bookings.filter(
    (b) => b.status === 'completed' && b.reviews.length === 0,
  )
  const staleRequests = bookings.filter((b) => {
    if (b.status !== 'requested') return false
    const hoursWaiting = (now - new Date(b.requested_at).getTime()) / 3_600_000
    return hoursWaiting >= STALE_REQUEST_HOURS
  })

  const pendingActions = [...needsReview.map((b) => ({ type: 'review' as const, booking: b })), ...staleRequests.map((b) => ({ type: 'stale' as const, booking: b }))]

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {customer.name.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here&apos;s a summary of your bookings and activity.
        </p>
      </div>

      {/* Pending actions — surface these prominently */}
      {pendingActions.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3">Action needed</h2>
          <div className="space-y-2">
            {pendingActions.map(({ type, booking }) => (
              <div
                key={`${type}-${booking.id}`}
                className={[
                  'flex items-start gap-4 rounded-xl border px-5 py-4',
                  type === 'review' ? 'border-primary-accent/30 bg-primary-accent/5' : 'border-amber-200 bg-amber-50',
                ].join(' ')}
              >
                <div className={[
                  'mt-0.5 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                  type === 'review' ? 'bg-primary-accent/15' : 'bg-amber-100',
                ].join(' ')}>
                  {type === 'review' ? (
                    <svg className="h-4 w-4 text-primary-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {type === 'review'
                      ? `Leave a review for ${booking.service?.title ?? 'a service'}`
                      : `Still waiting — ${booking.provider?.business_name} hasn't responded yet`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {booking.provider?.business_name} · {booking.service?.title}
                  </p>
                </div>
                <Link
                  href={type === 'review' ? `/customer-account/reviews?leave=${booking.id}` : `/customer-account/bookings`}
                  className="flex-shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {type === 'review' ? 'Review' : 'View'}
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active bookings */}
      <section>
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="text-base font-semibold">Active bookings</h2>
          <Link href="/customer-account/bookings" className="text-xs text-primary hover:underline">
            All bookings →
          </Link>
        </div>

        {activeBookings.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center">
            <p className="text-muted-foreground text-sm">No active bookings right now.</p>
            <Link
              href="/services"
              className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
            >
              Browse services
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {activeBookings.map((booking) => (
              <Link
                key={booking.id}
                href="/customer-account/bookings"
                className="flex items-center gap-4 rounded-xl border bg-card px-5 py-4 hover:bg-accent/30 transition-colors cursor-pointer"
              >
                <Avatar
                  src={booking.provider?.profile_image ?? null}
                  alt={booking.provider?.business_name ?? 'Provider'}
                  size="sm"
                  shape="rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{booking.service?.title ?? 'Service'}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {booking.provider?.business_name}
                    {booking.service_package ? ` · ${booking.service_package.name}` : ''}
                  </p>
                </div>
                <BookingStatusBadge status={booking.status} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Discovery — visually secondary */}
      <section className="border-t pt-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold">Book again</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Featured providers on the platform</p>
          </div>
          <Link href="/services" className="text-xs text-primary hover:underline flex-shrink-0">
            Browse all →
          </Link>
        </div>

        {featuredProviders.length === 0 ? (
          <Link
            href="/services"
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm hover:bg-accent transition-colors cursor-pointer"
          >
            Browse all services
          </Link>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {featuredProviders.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                href={`/providers/${p.slug ?? p.id}`}
                className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 hover:bg-accent/30 hover:border-primary-accent/30 transition-colors cursor-pointer"
              >
                <Avatar src={p.profile_image} alt={p.business_name} size="sm" shape="rounded" />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{p.business_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.providerTypeName}{p.locationCity ? ` · ${p.locationCity}` : ''}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
