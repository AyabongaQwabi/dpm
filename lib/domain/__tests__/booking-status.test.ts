import { describe, expect, it } from 'vitest'
import {
  evaluateTransition,
  evaluateAutoCompletion,
  isRefundingStatus,
  TRANSITION_RULES,
  BookingTransitionError,
  BookingAuthorizationError,
  type BookingRow,
  type BookingStatus,
} from '../booking'
import {
  CUSTOMER_CANCELLABLE,
  effectiveStatus,
  LEGACY_DISPUTE_MARKER,
  statusLabel,
  statusTone,
  timelineLine,
} from '../booking-status'

function makeBooking(overrides: Partial<BookingRow> = {}): BookingRow {
  return {
    id: 'book-1',
    providerId: 'prov-1',
    customerId: 'cust-1',
    status: 'requested',
    paymentStatus: 'captured',
    cancellationReason: null,
    requestedAt: new Date('2026-08-01T10:00:00Z'),
    providerCompletedAt: null,
    ...overrides,
  }
}

// ---------- Legal transitions ----------

describe('evaluateTransition — legal moves', () => {
  const legal: Array<{
    from: BookingStatus
    to: BookingStatus
    actor: 'customer' | 'provider' | 'system'
    note?: string
  }> = [
    { from: 'requested', to: 'accepted', actor: 'provider' },
    { from: 'requested', to: 'declined', actor: 'provider' },
    { from: 'requested', to: 'declined', actor: 'system' },
    { from: 'accepted', to: 'in_progress', actor: 'provider' },
    { from: 'accepted', to: 'completed_by_provider', actor: 'provider' },
    { from: 'in_progress', to: 'completed_by_provider', actor: 'provider' },
    { from: 'completed_by_provider', to: 'completed', actor: 'customer' },
    { from: 'completed_by_provider', to: 'completed', actor: 'system' },
    { from: 'disputed', to: 'completed', actor: 'customer' },
    { from: 'requested', to: 'cancelled', actor: 'customer', note: 'changed my mind' },
    { from: 'accepted', to: 'cancelled', actor: 'provider', note: 'cannot make it' },
    { from: 'in_progress', to: 'cancelled', actor: 'customer', note: 'no longer needed' },
    { from: 'in_progress', to: 'disputed', actor: 'customer', note: 'work is wrong' },
    { from: 'completed_by_provider', to: 'disputed', actor: 'customer', note: 'not done' },
  ]

  for (const move of legal) {
    it(`allows ${move.from} → ${move.to} by ${move.actor}`, () => {
      const actorId =
        move.actor === 'customer' ? 'cust-1' : move.actor === 'provider' ? 'prov-1' : null

      const result = evaluateTransition(
        makeBooking({ status: move.from }),
        move.to,
        move.actor,
        actorId,
        move.note,
      )

      expect(result.updatedFields.status).toBe(move.to)
      expect(result.historyEntry.fromStatus).toBe(move.from)
      expect(result.historyEntry.toStatus).toBe(move.to)
    })
  }

  it('records the cancellation reason on the booking', () => {
    const result = evaluateTransition(
      makeBooking({ status: 'accepted' }),
      'cancelled',
      'customer',
      'cust-1',
      '  plans changed  ',
    )
    expect(result.updatedFields.cancellationReason).toBe('plans changed')
  })

  it('nulls the actor id for system transitions', () => {
    const result = evaluateTransition(
      makeBooking({ status: 'requested' }),
      'declined',
      'system',
      null,
    )
    expect(result.historyEntry.actorId).toBeNull()
  })
})

// ---------- Illegal transitions ----------

describe('evaluateTransition — illegal moves throw', () => {
  it('rejects a jump straight from requested to completed', () => {
    expect(() =>
      evaluateTransition(makeBooking({ status: 'requested' }), 'completed', 'customer', 'cust-1'),
    ).toThrow(BookingTransitionError)
  })

  it('rejects any move out of a terminal state', () => {
    for (const terminal of ['completed', 'declined', 'cancelled'] as BookingStatus[]) {
      expect(() =>
        evaluateTransition(makeBooking({ status: terminal }), 'accepted', 'provider', 'prov-1'),
      ).toThrow(BookingTransitionError)
    }
  })

  it('rejects "requested" as a transition target — bookings start there', () => {
    expect(() =>
      evaluateTransition(makeBooking({ status: 'accepted' }), 'requested', 'provider', 'prov-1'),
    ).toThrow(BookingTransitionError)
  })

  it('requires a reason to cancel', () => {
    expect(() =>
      evaluateTransition(makeBooking({ status: 'accepted' }), 'cancelled', 'customer', 'cust-1', '   '),
    ).toThrow(BookingTransitionError)
  })

  it('requires a reason to raise a dispute', () => {
    expect(() =>
      evaluateTransition(
        makeBooking({ status: 'completed_by_provider' }),
        'disputed',
        'customer',
        'cust-1',
        null,
      ),
    ).toThrow(BookingTransitionError)
  })
})

// ---------- Role checks ----------

describe('evaluateTransition — role enforcement', () => {
  it('a customer cannot mark work complete', () => {
    expect(() =>
      evaluateTransition(
        makeBooking({ status: 'in_progress' }),
        'completed_by_provider',
        'customer',
        'cust-1',
      ),
    ).toThrow(BookingAuthorizationError)
  })

  it('a provider cannot confirm completion on the customer’s behalf', () => {
    expect(() =>
      evaluateTransition(
        makeBooking({ status: 'completed_by_provider' }),
        'completed',
        'provider',
        'prov-1',
      ),
    ).toThrow(BookingAuthorizationError)
  })

  it('system auto-completion cannot resolve a dispute', () => {
    expect(() =>
      evaluateTransition(
        makeBooking({ status: 'disputed' }),
        'completed',
        'system',
        null,
      ),
    ).toThrow(BookingAuthorizationError)
  })

  it('a provider cannot raise a dispute', () => {
    expect(() =>
      evaluateTransition(
        makeBooking({ status: 'completed_by_provider' }),
        'disputed',
        'provider',
        'prov-1',
        'unhappy',
      ),
    ).toThrow(BookingAuthorizationError)
  })

  it('a customer cannot accept their own booking', () => {
    expect(() =>
      evaluateTransition(makeBooking({ status: 'requested' }), 'accepted', 'customer', 'cust-1'),
    ).toThrow(BookingAuthorizationError)
  })

  it('a different provider cannot act on someone else’s booking', () => {
    expect(() =>
      evaluateTransition(makeBooking({ status: 'requested' }), 'accepted', 'provider', 'prov-OTHER'),
    ).toThrow(BookingAuthorizationError)
  })

  it('a different customer cannot cancel someone else’s booking', () => {
    expect(() =>
      evaluateTransition(
        makeBooking({ status: 'requested' }),
        'cancelled',
        'customer',
        'cust-OTHER',
        'nope',
      ),
    ).toThrow(BookingAuthorizationError)
  })
})

// ---------- Refunds ----------

describe('refunding statuses', () => {
  it('declined and cancelled refund credits to the wallet', () => {
    expect(isRefundingStatus('declined')).toBe(true)
    expect(isRefundingStatus('cancelled')).toBe(true)
  })

  it('no other status triggers a refund', () => {
    for (const status of [
      'requested',
      'accepted',
      'in_progress',
      'completed_by_provider',
      'completed',
      'disputed',
    ] as BookingStatus[]) {
      expect(isRefundingStatus(status)).toBe(false)
    }
  })
})

// ---------- Auto-completion ----------

describe('evaluateAutoCompletion', () => {
  const providerCompletedAt = new Date('2026-08-01T00:00:00Z')

  it('does nothing before the window elapses', () => {
    const result = evaluateAutoCompletion(
      makeBooking({ status: 'completed_by_provider', providerCompletedAt }),
      new Date('2026-08-06T00:00:00Z'),
      7,
    )
    expect(result).toBeNull()
  })

  it('completes once the window has passed', () => {
    const result = evaluateAutoCompletion(
      makeBooking({ status: 'completed_by_provider', providerCompletedAt }),
      new Date('2026-08-08T00:01:00Z'),
      7,
    )
    expect(result?.updatedFields.status).toBe('completed')
    expect(result?.historyEntry.actorType).toBe('system')
  })

  it('ignores bookings in any other status', () => {
    expect(
      evaluateAutoCompletion(
        makeBooking({ status: 'in_progress', providerCompletedAt }),
        new Date('2027-01-01T00:00:00Z'),
        7,
      ),
    ).toBeNull()
  })

  it('ignores a booking with no provider completion timestamp', () => {
    expect(
      evaluateAutoCompletion(
        makeBooking({ status: 'completed_by_provider', providerCompletedAt: null }),
        new Date('2027-01-01T00:00:00Z'),
        7,
      ),
    ).toBeNull()
  })
})

// ---------- Display vocabulary ----------

describe('status presentation', () => {
  it('presents the stored "requested" value as pending acceptance, never the raw enum', () => {
    expect(statusLabel('requested')).toBe('Waiting for provider')
    expect(statusLabel('requested')).not.toContain('requested')
  })

  it('folds the legacy __dispute__ marker into the real disputed status', () => {
    expect(effectiveStatus('cancelled', LEGACY_DISPUTE_MARKER)).toBe('disputed')
    expect(statusLabel('cancelled', LEGACY_DISPUTE_MARKER)).toBe('Issue raised')
    expect(statusTone('cancelled', LEGACY_DISPUTE_MARKER)).toBe('danger')
  })

  it('leaves an ordinary cancellation alone', () => {
    expect(effectiveStatus('cancelled', 'customer changed mind')).toBe('cancelled')
    expect(statusLabel('cancelled', 'customer changed mind')).toBe('Cancelled')
  })

  it('gives every known status a label with no underscores', () => {
    for (const status of Object.keys(TRANSITION_RULES) as BookingStatus[]) {
      expect(statusLabel(status)).not.toContain('_')
    }
  })

  it('phrases the timeline differently for each audience', () => {
    expect(timelineLine('accepted', 'customer')).toBe('Provider accepted your booking')
    expect(timelineLine('accepted', 'provider')).toBe('You accepted this booking')
  })

  it('does not throw on an unknown status reaching a render path', () => {
    expect(statusLabel('some_future_status' as BookingStatus)).toBe('some future status')
    expect(statusTone('some_future_status' as BookingStatus)).toBe('neutral')
  })

  it('only allows cancellation before work is finished', () => {
    expect(CUSTOMER_CANCELLABLE).not.toContain('completed')
    expect(CUSTOMER_CANCELLABLE).not.toContain('completed_by_provider')
  })
})
