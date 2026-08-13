import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { requireProviderSession } from '@/lib/session'
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
import { isThreadOpen, nudgeHoursRemaining } from '@/lib/domain/booking-messages'
import {
  MESSAGING_CLOSE_AFTER_COMPLETED_DAYS,
  NUDGE_RATE_LIMIT_HOURS,
} from '@/lib/booking-lifecycle-config'
import {
  acceptBooking,
  declineBooking,
  markWorkComplete,
  nudgeCustomer,
  startWork,
} from '@/lib/actions/provider-bookings'
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

export default async function ProviderBookingDetailPage({ params }: Props) {
  const { id } = await params
  const { provider } = await requireProviderSession()

  const booking = await loadBookingDetail(id)
  if (!booking || booking.providerId !== provider.id) notFound()

  await markBookingMessagesRead(id)
  await snapshotBookingRequirements({ bookingId: id, packageId: booking.packageId })

  // Captured before render so the lint rule against impure calls during
  // render is satisfied, and so every comparison uses one consistent instant.
  const now = new Date()

  const [events, requirements, messages] = await Promise.all([
    loadBookingEvents(id),
    loadBookingRequirements(id),
    loadBookingMessages(id),
  ])

  const status = booking.status
  const canRespond = status === 'requested'
  const canStart = status === 'accepted'
  const canComplete = status === 'accepted' || status === 'in_progress'

  const threadOpen = isThreadOpen({
    status: booking.status,
    completedAt: booking.completedAt,
    closeAfterDays: MESSAGING_CLOSE_AFTER_COMPLETED_DAYS,
    now,
  })

  const nudgeHours = nudgeHoursRemaining({
    lastNudgeAt: booking.lastNudgeAt,
    rateLimitHours: NUDGE_RATE_LIMIT_HOURS,
    now,
  })
  const nudgeDisabledReason =
    nudgeHours > 0
      ? `You can send another reminder in ${nudgeHours} hour${nudgeHours === 1 ? '' : 's'}.`
      : null

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <nav className="text-sm text-muted-foreground">
        <Link href="/provider-dashboard/bookings" className="hover:underline">
          Bookings
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">{bookingReference(booking.id)}</span>
      </nav>

      <header className="rounded-2xl border p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{booking.serviceTitle}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              for <span className="font-medium text-foreground">{booking.customerName}</span>
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
            <dt className="text-xs text-muted-foreground">Job value</dt>
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

        {/* Only the contact details the customer agreed to share. Nothing more. */}
        <div className="mt-4 border-t pt-4">
          <p className="text-xs text-muted-foreground">Customer contact</p>
          <p className="mt-1 text-sm">
            {booking.customerEmail}
            {booking.customerPhone && ` · ${booking.customerPhone}`}
          </p>
        </div>

        {booking.notes && (
          <div className="mt-4 border-t pt-4">
            <p className="text-xs text-muted-foreground">Notes from the customer</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{booking.notes}</p>
          </div>
        )}

        {status === 'completed' && (
          <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-900">
            Payout of R{booking.netPayoutAmount} is being processed.
          </p>
        )}

        {booking.disputeReason && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900">
            <span className="font-medium">Customer raised an issue:</span>{' '}
            {booking.disputeReason}
          </p>
        )}
      </header>

      {/* Requirements — read and download only */}
      <RequirementsPanel
        bookingId={booking.id}
        requirements={requirements.requirements}
        adHocFiles={requirements.adHocFiles}
        progress={requirements.progress}
        mode="download"
        canModify={false}
        nudgeAction={nudgeCustomer}
        nudgeDisabledReason={nudgeDisabledReason}
      />

      {(canRespond || canStart || canComplete) && (
        <section className="rounded-2xl border p-6">
          <h2 className="font-semibold">Actions</h2>
          <div className="mt-4 flex flex-wrap items-start gap-3">
            {canRespond && (
              <>
                <form action={acceptBooking}>
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <button
                    type="submit"
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    Accept booking
                  </button>
                </form>
                <form action={declineBooking} className="flex items-center gap-2">
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <input
                    type="text"
                    name="reason"
                    placeholder="Reason (shared with the customer)"
                    className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Decline
                  </button>
                </form>
              </>
            )}

            {canStart && (
              <form action={startWork}>
                <input type="hidden" name="bookingId" value={booking.id} />
                <button
                  type="submit"
                  className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Mark as started
                </button>
              </form>
            )}

            {canComplete && (
              <form action={markWorkComplete}>
                <input type="hidden" name="bookingId" value={booking.id} />
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Mark work complete
                </button>
              </form>
            )}
          </div>

          {canRespond && (
            <p className="mt-3 text-xs text-muted-foreground">
              Declining returns the customer&apos;s credits to their wallet.
            </p>
          )}
          {canComplete && (
            <p className="mt-3 text-xs text-muted-foreground">
              The customer confirms completion before the payout is recorded.
            </p>
          )}
        </section>
      )}

      <BookingThread
        bookingId={booking.id}
        messages={messages}
        viewerRole="provider"
        isOpen={threadOpen}
        closedNotice="This conversation closed because the booking was completed some time ago."
      />

      <BookingTimeline events={events} audience="provider" />
    </div>
  )
}
