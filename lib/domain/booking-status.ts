/**
 * The one place a stored booking status becomes words a person reads.
 *
 * Status strings were previously repeated as raw literals across ~8 files with
 * no shared constant. Everything customer- and provider-facing now comes from
 * here, so the "requested means pending_acceptance" mapping is stated once.
 *
 * Pure — no DB, no framework imports (ARCH-006).
 */

import type { BookingStatus } from './booking'

/**
 * Historical dispute marker. Before `disputed` existed as an enum value, a
 * dispute was recorded as a `cancelled` row carrying this exact
 * cancellation_reason. Those rows are left as they are (migrations are
 * additive), so display code has to recognise the marker.
 */
export const LEGACY_DISPUTE_MARKER = '__dispute__'

/**
 * The spec's vocabulary → the stored value. `pending_acceptance` is the
 * concept; `requested` is what is in the column.
 */
export const PENDING_ACCEPTANCE: BookingStatus = 'requested'

interface StatusPresentation {
  /** Short badge text. */
  label: string
  /** Past-tense line for the customer-facing timeline. */
  timelineCustomer: string
  /** Past-tense line for the provider-facing timeline. */
  timelineProvider: string
  /** Badge tone; maps to the existing badge styling vocabulary. */
  tone: 'neutral' | 'info' | 'progress' | 'success' | 'warning' | 'danger'
}

const PRESENTATION: Record<BookingStatus, StatusPresentation> = {
  requested: {
    label: 'Waiting for provider',
    timelineCustomer: 'You booked this service',
    timelineProvider: 'Booking received',
    tone: 'info',
  },
  accepted: {
    label: 'Accepted',
    timelineCustomer: 'Provider accepted your booking',
    timelineProvider: 'You accepted this booking',
    tone: 'progress',
  },
  in_progress: {
    label: 'Work underway',
    timelineCustomer: 'Work started',
    timelineProvider: 'You marked work as started',
    tone: 'progress',
  },
  completed_by_provider: {
    label: 'Awaiting your confirmation',
    timelineCustomer: 'Provider marked the work complete',
    timelineProvider: 'You marked the work complete',
    tone: 'warning',
  },
  completed: {
    label: 'Completed',
    timelineCustomer: 'You confirmed the work was completed',
    timelineProvider: 'Customer confirmed completion',
    tone: 'success',
  },
  declined: {
    label: 'Declined',
    timelineCustomer: 'Provider declined — your credits were returned',
    timelineProvider: 'You declined this booking',
    tone: 'danger',
  },
  cancelled: {
    label: 'Cancelled',
    timelineCustomer: 'Booking cancelled — your credits were returned',
    timelineProvider: 'Booking cancelled',
    tone: 'neutral',
  },
  disputed: {
    label: 'Issue raised',
    timelineCustomer: 'You raised an issue with this booking',
    timelineProvider: 'Customer raised an issue',
    tone: 'danger',
  },
}

/**
 * Resolve the status to display. Folds the legacy `__dispute__` marker on
 * historical cancelled rows into the real `disputed` status.
 */
export function effectiveStatus(
  status: BookingStatus,
  cancellationReason?: string | null,
): BookingStatus {
  if (status === 'cancelled' && cancellationReason === LEGACY_DISPUTE_MARKER) {
    return 'disputed'
  }
  return status
}

/**
 * Presentation for a status, tolerating a value this build does not know
 * about (a future enum addition reaching an older deploy) rather than
 * throwing on a render path.
 */
function present(
  status: BookingStatus,
  cancellationReason?: string | null,
): StatusPresentation {
  const resolved = effectiveStatus(status, cancellationReason)
  return (
    PRESENTATION[resolved] ?? {
      label: String(status).replace(/_/g, ' '),
      timelineCustomer: 'Booking updated',
      timelineProvider: 'Booking updated',
      tone: 'neutral' as const,
    }
  )
}

export function statusLabel(
  status: BookingStatus,
  cancellationReason?: string | null,
): string {
  return present(status, cancellationReason).label
}

export function statusTone(
  status: BookingStatus,
  cancellationReason?: string | null,
): StatusPresentation['tone'] {
  return present(status, cancellationReason).tone
}

export function timelineLine(
  status: BookingStatus,
  audience: 'customer' | 'provider',
  cancellationReason?: string | null,
): string {
  const p = present(status, cancellationReason)
  return audience === 'customer' ? p.timelineCustomer : p.timelineProvider
}

/** Statuses where the customer may still cancel (work has not begun). */
export const CUSTOMER_CANCELLABLE: BookingStatus[] = ['requested', 'accepted']

/** Statuses that count as "needs the provider to act", for list sorting. */
export const PROVIDER_ACTION_NEEDED: BookingStatus[] = ['requested', 'accepted', 'in_progress']

/** Statuses that count as "needs the customer to act", for list sorting. */
export const CUSTOMER_ACTION_NEEDED: BookingStatus[] = ['completed_by_provider']

/** Statuses in which the booking is still live (not resolved one way or another). */
export const OPEN_STATUSES: BookingStatus[] = [
  'requested',
  'accepted',
  'in_progress',
  'completed_by_provider',
  'disputed',
]

/** Filter options for the booking list views, in display order. */
export const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All bookings' },
  { value: 'open', label: 'Open' },
  { value: 'requested', label: 'Waiting for provider' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'in_progress', label: 'Work underway' },
  { value: 'completed_by_provider', label: 'Awaiting confirmation' },
  { value: 'completed', label: 'Completed' },
  { value: 'declined', label: 'Declined' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'disputed', label: 'Issue raised' },
]
