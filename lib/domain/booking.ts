// Phase 3: Implement booking state machine logic per business logic Section 2.
// Pure functions only — no framework imports (ARCH-006).

import { ConfigStore, CONFIG_KEYS, getConfigNumber } from "./config";

// ---------- Types mirroring schema enums and booking fields ----------

// The stored vocabulary. "requested" is the DB value for the concept the
// lifecycle spec calls `pending_acceptance` — see the enum-decision note in
// supabase/migrations/20260818000000_booking_lifecycle.sql for why the value
// was added to, not renamed in, the live enum. Display labelling lives in
// lib/domain/booking-status.ts; nothing here should render a raw status.
export type BookingStatus =
  | "requested"
  | "accepted"
  | "in_progress"
  | "completed_by_provider"
  | "completed"
  | "declined"
  | "cancelled"
  | "disputed";

export type PaymentStatus = "pending" | "captured" | "failed" | "refunded";

export type ActorType = "customer" | "provider" | "system";

export interface BookingRow {
  id: string;
  providerId: string;
  customerId: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus | null;
  cancellationReason: string | null;
  requestedAt: Date;
  /** Set when the provider marks the work done — drives auto-completion. */
  providerCompletedAt?: Date | null;
}

// A new status history entry to be written — returned by each transition function
// so the caller (route handler or worker) persists it.
export interface StatusHistoryEntry {
  bookingId: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  actorType: ActorType;
  actorId: string | null;
}

// Every transition returns the updated booking fields + the history row to write.
export interface TransitionResult {
  updatedFields: Partial<BookingRow>;
  historyEntry: StatusHistoryEntry;
}

// ---------- Terminal states (BOOK-LOGIC-003) ----------

const TERMINAL_STATES = new Set<BookingStatus>([
  "completed",
  "declined",
  "cancelled",
]);

// "disputed" is deliberately NOT terminal: a dispute is a flag raised on work
// that has been marked done, and resolution (out of scope for this pass) has
// to be able to move the booking on to completed or cancelled.


export function isTerminalState(status: BookingStatus): boolean {
  return TERMINAL_STATES.has(status);
}

// ---------- Guard helpers ----------

function assertNotTerminal(booking: BookingRow): void {
  if (isTerminalState(booking.status)) {
    throw new BookingTransitionError(
      `Booking ${booking.id} is in a terminal state (${booking.status}) and cannot be transitioned.`,
    );
  }
}

function assertCurrentStatus(booking: BookingRow, expected: BookingStatus): void {
  if (booking.status !== expected) {
    throw new BookingTransitionError(
      `Expected booking ${booking.id} to be in state "${expected}" but found "${booking.status}".`,
    );
  }
}

function assertActor(
  booking: BookingRow,
  actorType: ActorType,
  actorId: string,
  expectedType: ActorType,
  expectedId: string,
  action: string,
): void {
  if (actorType !== expectedType || actorId !== expectedId) {
    throw new BookingAuthorizationError(
      `Only the ${expectedType} (${expectedId}) may ${action} booking ${booking.id}.`,
    );
  }
}

// ---------- Custom error types ----------

export class BookingTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingTransitionError";
  }
}

export class BookingAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingAuthorizationError";
  }
}

// ---------- Transitions ----------

// requested → accepted (BOOK-LOGIC-001: only the provider may accept)
export function acceptBooking(
  booking: BookingRow,
  actorType: ActorType,
  actorId: string,
): TransitionResult {
  assertNotTerminal(booking);
  assertCurrentStatus(booking, "requested");
  assertActor(
    booking,
    actorType,
    actorId,
    "provider",
    booking.providerId,
    "accept",
  );

  return {
    updatedFields: { status: "accepted" },
    historyEntry: {
      bookingId: booking.id,
      fromStatus: "requested",
      toStatus: "accepted",
      actorType: "provider",
      actorId,
    },
  };
}

// requested → declined (BOOK-LOGIC-001: only the provider may decline)
export function declineBooking(
  booking: BookingRow,
  actorType: ActorType,
  actorId: string,
): TransitionResult {
  assertNotTerminal(booking);
  assertCurrentStatus(booking, "requested");
  assertActor(
    booking,
    actorType,
    actorId,
    "provider",
    booking.providerId,
    "decline",
  );

  return {
    updatedFields: { status: "declined" },
    historyEntry: {
      bookingId: booking.id,
      fromStatus: "requested",
      toStatus: "declined",
      actorType: "provider",
      actorId,
    },
  };
}

// requested → cancelled (BOOK-LOGIC-002: only the customer may cancel a requested booking)
// accepted → cancelled (BOOK-LOGIC-006: cancellation reason required; either party)
export function cancelBooking(
  booking: BookingRow,
  actorType: ActorType,
  actorId: string,
  cancellationReason: string,
): TransitionResult {
  assertNotTerminal(booking);

  if (booking.status === "requested") {
    // Only the customer may cancel at this stage (BOOK-LOGIC-002).
    assertActor(
      booking,
      actorType,
      actorId,
      "customer",
      booking.customerId,
      "cancel a requested",
    );
  } else if (booking.status === "accepted") {
    // Either party may cancel after acceptance; just verify they are one of the two.
    if (
      !(actorType === "customer" && actorId === booking.customerId) &&
      !(actorType === "provider" && actorId === booking.providerId)
    ) {
      throw new BookingAuthorizationError(
        `Only the customer or provider may cancel booking ${booking.id}.`,
      );
    }
  } else {
    throw new BookingTransitionError(
      `Booking ${booking.id} cannot be cancelled from state "${booking.status}".`,
    );
  }

  if (!cancellationReason || cancellationReason.trim() === "") {
    throw new BookingTransitionError(
      `A cancellation reason is required (BOOK-LOGIC-006).`,
    );
  }

  return {
    updatedFields: {
      status: "cancelled",
      cancellationReason: cancellationReason.trim(),
    },
    historyEntry: {
      bookingId: booking.id,
      fromStatus: booking.status,
      toStatus: "cancelled",
      actorType,
      actorId,
    },
  };
}

// accepted → completed (BOOK-LOGIC-009: must be in accepted state)
// Only the provider or system may mark a booking complete.
export function completeBooking(
  booking: BookingRow,
  actorType: ActorType,
  actorId: string,
): TransitionResult {
  assertNotTerminal(booking);
  assertCurrentStatus(booking, "accepted");

  if (
    !(actorType === "provider" && actorId === booking.providerId) &&
    actorType !== "system"
  ) {
    throw new BookingAuthorizationError(
      `Only the provider or system may complete booking ${booking.id}.`,
    );
  }

  return {
    updatedFields: { status: "completed" },
    historyEntry: {
      bookingId: booking.id,
      fromStatus: "accepted",
      toStatus: "completed",
      actorType,
      actorId: actorType === "system" ? null : actorId,
    },
  };
}

// ---------- Lifecycle transitions added by the booking-lifecycle build ----------
//
// The declarative table below is the single authority on which moves are legal
// and who may make them. lib/actions/booking-transitions.ts's transitionBooking()
// is the only writer of bookings.status in the application; every UI surface
// goes through it.

export interface TransitionRule {
  from: BookingStatus[];
  /** Roles permitted to make this move. "system" covers cron sweeps. */
  actors: ActorType[];
  /** Free-text reason required for the move to be legal. */
  requiresNote?: boolean;
}

export const TRANSITION_RULES: Record<BookingStatus, TransitionRule> = {
  // Never a transition target — bookings are created in this state.
  requested: { from: [], actors: [] },

  accepted: { from: ["requested"], actors: ["provider"] },
  declined: { from: ["requested"], actors: ["provider", "system"] },

  in_progress: { from: ["accepted"], actors: ["provider"] },
  completed_by_provider: {
    from: ["accepted", "in_progress"],
    actors: ["provider"],
  },

  // The customer confirms; the system may auto-confirm after the configured
  // window (gated off until the window is confirmed). Provider cannot
  // self-confirm — that is the whole point of the two-step completion.
  completed: {
    from: ["accepted", "in_progress", "completed_by_provider", "disputed"],
    actors: ["customer", "system"],
  },

  // Cancellation is only available before work is finished.
  cancelled: {
    from: ["requested", "accepted", "in_progress"],
    actors: ["customer", "provider", "system"],
    requiresNote: true,
  },

  // Raised by the customer once the provider claims the work is done.
  disputed: {
    from: ["in_progress", "completed_by_provider"],
    actors: ["customer"],
    requiresNote: true,
  },
};

/** Which statuses refund the customer's credits to their wallet. */
export const REFUNDING_STATUSES: BookingStatus[] = ["declined", "cancelled"];

export function isRefundingStatus(status: BookingStatus): boolean {
  return REFUNDING_STATUSES.includes(status);
}

/**
 * Pure guard for a proposed transition. Returns the history entry to persist,
 * or throws. Actor identity is checked against the booking's own parties, so a
 * provider cannot act on a booking that is not theirs even if their role is
 * permitted for the move.
 */
export function evaluateTransition(
  booking: BookingRow,
  toStatus: BookingStatus,
  actorType: ActorType,
  actorId: string | null,
  note?: string | null,
): TransitionResult {
  const rule = TRANSITION_RULES[toStatus];

  if (!rule || rule.from.length === 0) {
    throw new BookingTransitionError(
      `"${toStatus}" is not a valid transition target.`,
    );
  }

  if (!rule.from.includes(booking.status)) {
    throw new BookingTransitionError(
      `Booking ${booking.id} cannot move from "${booking.status}" to "${toStatus}".`,
    );
  }

  if (!rule.actors.includes(actorType)) {
    throw new BookingAuthorizationError(
      `A ${actorType} may not move booking ${booking.id} to "${toStatus}".`,
    );
  }

  // A disputed booking can still be completed if the customer and provider
  // resolve it in chat, but it must be the customer's explicit confirmation.
  // Auto-completion/system completion must never close an active dispute.
  if (booking.status === "disputed" && toStatus === "completed" && actorType !== "customer") {
    throw new BookingAuthorizationError(
      `Only the customer may confirm completion after a dispute on booking ${booking.id}.`,
    );
  }

  // Identity check: the actor must be the booking's own customer/provider.
  if (actorType === "customer" && actorId !== booking.customerId) {
    throw new BookingAuthorizationError(
      `Only the booking's customer may move booking ${booking.id} to "${toStatus}".`,
    );
  }
  if (actorType === "provider" && actorId !== booking.providerId) {
    throw new BookingAuthorizationError(
      `Only the booking's provider may move booking ${booking.id} to "${toStatus}".`,
    );
  }

  const trimmedNote = note?.trim() || null;
  if (rule.requiresNote && !trimmedNote) {
    throw new BookingTransitionError(
      `Moving booking ${booking.id} to "${toStatus}" requires a reason.`,
    );
  }

  const updatedFields: Partial<BookingRow> = { status: toStatus };
  if (toStatus === "cancelled" && trimmedNote) {
    updatedFields.cancellationReason = trimmedNote;
  }

  return {
    updatedFields,
    historyEntry: {
      bookingId: booking.id,
      fromStatus: booking.status,
      toStatus,
      actorType,
      actorId: actorType === "system" ? null : actorId,
    },
  };
}

/**
 * Should this booking auto-complete? Pure, so `now` and the window come from
 * the caller. Returns null unless the booking has been sitting in
 * completed_by_provider past the configured window.
 */
export function evaluateAutoCompletion(
  booking: BookingRow,
  now: Date,
  windowDays: number,
): TransitionResult | null {
  if (booking.status !== "completed_by_provider") return null;
  if (!booking.providerCompletedAt) return null;

  const dueAt = new Date(
    booking.providerCompletedAt.getTime() + windowDays * 24 * 60 * 60 * 1000,
  );
  if (now < dueAt) return null;

  return evaluateTransition(booking, "completed", "system", null);
}

// ---------- Auto-expiry (BOOK-LOGIC-005) ----------
//
// Returns a TransitionResult if the booking should expire, null otherwise.
// The caller supplies `now` so this remains pure/testable.

export async function evaluateAutoExpiry(
  booking: BookingRow,
  now: Date,
  config: ConfigStore,
): Promise<TransitionResult | null> {
  if (booking.status !== "requested") return null;

  const windowHours = await getConfigNumber(
    config,
    CONFIG_KEYS.BOOKING_AUTO_EXPIRY_HOURS,
  );

  const expiresAt = new Date(
    booking.requestedAt.getTime() + windowHours * 60 * 60 * 1000,
  );

  if (now < expiresAt) return null;

  return {
    updatedFields: { status: "declined" },
    historyEntry: {
      bookingId: booking.id,
      fromStatus: "requested",
      toStatus: "declined",
      actorType: "system",
      actorId: null,
    },
  };
}
