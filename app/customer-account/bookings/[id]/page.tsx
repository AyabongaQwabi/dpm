import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { requireCustomerSession } from '@/lib/session'
import {
  bookingReference,
  loadBookingDetail,
  loadBookingEvents,
} from '@/lib/booking-detail'
import { loadBookingRequirements } from '@/lib/actions/booking-requirements'
import { snapshotBookingRequirements } from '@/lib/actions/booking-requirements'
import {
  loadBookingMessages,
  markBookingMessagesRead,
} from '@/lib/actions/booking-messages'
import { isThreadOpen } from '@/lib/domain/booking-messages'
import { MESSAGING_CLOSE_AFTER_COMPLETED_DAYS } from '@/lib/booking-lifecycle-config'
import { CUSTOMER_CANCELLABLE } from '@/lib/domain/booking-status'
import type { BookingStatus } from '@/lib/domain/booking'
import { cancelBooking, confirmCompletion, disputeBooking } from '@/lib/actions/customer'
import { BookingStatusBadge } from '@/components/customer-account/BookingStatusBadge'
import { BookingTimeline } from '@/components/booking/BookingTimeline'
import { RequirementsPanel } from '@/components/booking/RequirementsPanel'
import { BookingThread } from '@/components/booking/BookingThread'
import { formatCredits } from '@/lib/format-credits'

export const metadata: Metadata = {
  title: 'Booking',
  robots: { index: false, follow: false },
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function CustomerBookingDetailPage({ params }: Props) {
  const { id } = await params
  const { customer } = await requireCustomerSession()

  const booking = await loadBookingDetail(id)
  if (!booking || booking.customerId !== customer.id) notFound()

  await markBookingMessagesRead(id)
  await snapshotBookingRequirements({ bookingId: id, packageId: booking.packageId })

  const [events, requirements, messages] = await Promise.all([
    loadBookingEvents(id),
    loadBookingRequirements(id),
    loadBookingMessages(id),
  ])

  const status = booking.status as BookingStatus
  const canCancel = CUSTOMER_CANCELLABLE.includes(status)
  const canConfirm = status === 'completed_by_provider' || status === 'disputed'
  const canDispute = status === 'in_progress' || status === 'completed_by_provider'
  const canReview = status === 'completed'

  const threadOpen = isThreadOpen({
    status: booking.status,
    completedAt: booking.completedAt,
    closeAfterDays: MESSAGING_CLOSE_AFTER_COMPLETED_DAYS,
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <nav className="text-sm text-muted-foreground">
        <Link href="/customer-account/bookings" className="hover:underline">
          Bookings
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">{bookingReference(booking.id)}</span>
      </nav>

      {/* Header */}
      <header className="rounded-2xl border p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{booking.serviceTitle}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              from{' '}
              {booking.providerSlug ? (
                <Link
                  href={`/providers/${booking.providerSlug}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {booking.providerName}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{booking.providerName}</span>
              )}
              {booking.packageName && ` · ${booking.packageName} package`}
            </p>
          </div>
          <BookingStatusBadge
            status={booking.status}
            cancellationReason={booking.cancellationReason}
          />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t pt-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Reference</dt>
            <dd className="mt-0.5 font-medium">{bookingReference(booking.id)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Total paid</dt>
            <dd className="mt-0.5 font-medium">{formatCredits(booking.finalPrice)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Booked</dt>
            <dd className="mt-0.5 font-medium">
              {new Date(booking.createdAt).toLocaleDateString('en-ZA', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </dd>
          </div>
        </dl>

        {booking.disputeReason && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900">
            <span className="font-medium">Issue raised:</span> {booking.disputeReason}
            <br />
            <span className="text-xs">
              Our team will be in touch. TODO(aya): legal review — dispute handling wording.
            </span>
          </p>
        )}
      </header>

      {/* Requirements — prominent while anything is outstanding */}
      <RequirementsPanel
        bookingId={booking.id}
        requirements={requirements.requirements}
        adHocFiles={requirements.adHocFiles}
        progress={requirements.progress}
        mode="upload"
        canModify={booking.status !== 'completed'}
      />

      {/* Actions */}
      {(canCancel || canConfirm || canDispute || canReview) && (
        <section className="rounded-2xl border p-6">
          <h2 className="font-semibold">Actions</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {canConfirm && (
              <form action={confirmCompletion}>
                <input type="hidden" name="bookingId" value={booking.id} />
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Confirm completion
                </button>
              </form>
            )}

            {canReview && (
              <Link
                href="/customer-account/reviews"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Leave a review
              </Link>
            )}

            {canCancel && (
              <form action={cancelBooking} className="flex items-center gap-2">
                <input type="hidden" name="bookingId" value={booking.id} />
                <input
                  type="text"
                  name="reason"
                  required
                  placeholder="Reason for cancelling"
                  className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel booking
                </button>
              </form>
            )}

            {canDispute && (
              <form action={disputeBooking} className="flex items-center gap-2">
                <input type="hidden" name="bookingId" value={booking.id} />
                <input
                  type="text"
                  name="reason"
                  required
                  placeholder="What went wrong?"
                  className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Raise an issue
                </button>
              </form>
            )}
          </div>

          {canCancel && (
            <p className="mt-3 text-xs text-muted-foreground">
              Cancelling returns your credits to your wallet. TODO(aya): legal review —
              cancellation terms.
            </p>
          )}
        </section>
      )}

      <BookingThread
        bookingId={booking.id}
        messages={messages}
        viewerRole="customer"
        isOpen={threadOpen}
        closedNotice="This conversation closed because the booking was completed some time ago."
      />

      <BookingTimeline events={events} audience="customer" />
    </div>
  )
}
