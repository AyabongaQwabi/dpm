// Phase 3: Implement booking state machine logic per business logic Section 2.
// Pure functions only — no framework imports (ARCH-006).

import { ConfigStore, CONFIG_KEYS, getConfigNumber } from "./config";

// ---------- Types mirroring schema enums and booking fields ----------

export type BookingStatus =
  | "requested"
  | "accepted"
  | "declined"
  | "completed"
  | "cancelled";

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
