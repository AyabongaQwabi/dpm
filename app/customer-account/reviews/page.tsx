import { requireCustomerSession } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { ReviewForm } from '@/components/customer-account/ReviewForm'

interface Props {
  searchParams: Promise<{ leave?: string }>
}

export default async function CustomerReviewsPage({ searchParams }: Props) {
  const { leave: autoOpenBookingId } = await searchParams
  const { customer } = await requireCustomerSession()
  const supabase = await createClient()

  // Completed bookings without a review (can leave review)
  const { data: rawCompleted } = await supabase
    .from('bookings')
    .select(`
      id, final_price, updated_at,
      service:services(id, title),
      provider:providers(id, business_name, slug),
      service_package:service_packages(id, name),
      reviews(id)
    `)
    .eq('customer_id', customer.id)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false })

  // Already submitted reviews
  const { data: rawReviews } = await supabase
    .from('reviews')
    .select(`
      id, rating, comment, created_at,
      service:services(id, title),
      provider:providers(id, business_name)
    `)
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })

  type RawBooking = {
    id: string; final_price: number; updated_at: string
    service: { id: string; title: string } | { id: string; title: string }[] | null
    provider: { id: string; business_name: string; slug: string | null } | { id: string; business_name: string; slug: string | null }[] | null
    service_package: { id: string; name: string } | { id: string; name: string }[] | null
    reviews: { id: string }[]
  }

  type RawReview = {
    id: string; rating: number; comment: string; created_at: string
    service: { id: string; title: string } | { id: string; title: string }[] | null
    provider: { id: string; business_name: string } | { id: string; business_name: string }[] | null
  }

  function first<T>(v: T | T[] | null | undefined): T | null {
    if (!v) return null
    return Array.isArray(v) ? (v[0] ?? null) : v
  }

  const canLeave = ((rawCompleted ?? []) as unknown as RawBooking[])
    .filter((b) => !b.reviews || b.reviews.length === 0)
    .map((b) => ({
      ...b,
      service: first(b.service),
      provider: first(b.provider),
      service_package: first(b.service_package),
    }))

  const submitted = ((rawReviews ?? []) as unknown as RawReview[]).map((r) => ({
    ...r,
    service: first(r.service),
    provider: first(r.provider),
  }))

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Share your experience to help other customers find great providers.
        </p>
      </div>

      {/* Section 1: Can leave a review */}
      {canLeave.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-4">Waiting for your review</h2>
          <div className="space-y-4">
            {canLeave.map((booking) => {
              const isOpen = autoOpenBookingId === booking.id
              return (
                <div key={booking.id} className="rounded-2xl border bg-card overflow-hidden">
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm">{booking.service?.title ?? 'Service'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {booking.provider?.business_name}
                          {booking.service_package ? ` · ${booking.service_package.name}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Completed {new Date(booking.updated_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <span className="inline-flex items-center rounded-full border border-primary-accent/30 bg-primary-accent/10 px-2.5 py-0.5 text-xs font-semibold text-primary-accent flex-shrink-0">
                        Review pending
                      </span>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="border-t px-5 py-5">
                      <ReviewForm
                        bookingId={booking.id}
                        serviceId={booking.service?.id ?? ''}
                        packageId={booking.service_package?.id ?? null}
                      />
                    </div>
                  ) : (
                    <div className="border-t border-border bg-muted/30 px-5 py-3">
                      <a
                        href={`/customer-account/reviews?leave=${booking.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary-accent px-3 py-1.5 text-xs font-semibold text-primary-accent-foreground hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        Write a review
                      </a>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Section 2: Already submitted */}
      <section>
        <h2 className="text-base font-semibold mb-4">
          {submitted.length === 0 ? 'Your reviews' : `Your reviews (${submitted.length})`}
        </h2>

        {submitted.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center">
            <p className="text-muted-foreground text-sm">
              {canLeave.length > 0
                ? 'Reviews you leave will appear here.'
                : 'No reviews yet. Complete a booking to leave your first review.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {submitted.map((review) => (
              <div key={review.id} className="rounded-2xl border bg-card px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{review.service?.title ?? 'Service'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{review.provider?.business_name}</p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg
                        key={i}
                        className={`h-4 w-4 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-muted stroke-muted-foreground/30'}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        aria-hidden="true"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-sm text-foreground leading-relaxed">{review.comment}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(review.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
