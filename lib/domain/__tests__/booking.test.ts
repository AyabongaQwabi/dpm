import { describe, it, expect } from "vitest";
import {
  acceptBooking,
  declineBooking,
  cancelBooking,
  completeBooking,
  evaluateAutoExpiry,
  isTerminalState,
  BookingTransitionError,
  BookingAuthorizationError,
  type BookingRow,
} from "../booking";
import { InMemoryConfigStore, CONFIG_KEYS } from "../config";

// ---------- Shared fixtures ----------

function makeBooking(overrides: Partial<BookingRow> = {}): BookingRow {
  return {
    id: "book-1",
    providerId: "prov-1",
    customerId: "cust-1",
    status: "requested",
    paymentStatus: null,
    cancellationReason: null,
    requestedAt: new Date("2026-06-01T10:00:00Z"),
    ...overrides,
  };
}

// ---------- Terminal states ----------

describe("isTerminalState", () => {
  it("identifies terminal states", () => {
    expect(isTerminalState("completed")).toBe(true);
    expect(isTerminalState("declined")).toBe(true);
    expect(isTerminalState("cancelled")).toBe(true);
  });

  it("identifies non-terminal states", () => {
    expect(isTerminalState("requested")).toBe(false);
    expect(isTerminalState("accepted")).toBe(false);
  });
});

// ---------- acceptBooking ----------

describe("acceptBooking", () => {
  it("transitions requested → accepted when provider acts (BOOK-LOGIC-001)", () => {
    const booking = makeBooking();
    const result = acceptBooking(booking, "provider", "prov-1");
    expect(result.updatedFields.status).toBe("accepted");
    expect(result.historyEntry.fromStatus).toBe("requested");
    expect(result.historyEntry.toStatus).toBe("accepted");
    expect(result.historyEntry.actorType).toBe("provider");
  });

  it("throws when customer tries to accept (BOOK-LOGIC-001)", () => {
    const booking = makeBooking();
    expect(() => acceptBooking(booking, "customer", "cust-1")).toThrow(
      BookingAuthorizationError,
    );
  });

  it("throws when booking is not in requested state", () => {
    const booking = makeBooking({ status: "accepted" });
    expect(() => acceptBooking(booking, "provider", "prov-1")).toThrow(
      BookingTransitionError,
    );
  });

  it("throws when booking is already in a terminal state (BOOK-LOGIC-003)", () => {
    const booking = makeBooking({ status: "completed" });
    expect(() => acceptBooking(booking, "provider", "prov-1")).toThrow(
      BookingTransitionError,
    );
  });

  it("writes a history entry (BOOK-LOGIC-004)", () => {
    const booking = makeBooking();
    const result = acceptBooking(booking, "provider", "prov-1");
    expect(result.historyEntry.bookingId).toBe("book-1");
    expect(result.historyEntry.fromStatus).toBe("requested");
    expect(result.historyEntry.toStatus).toBe("accepted");
  });
});

// ---------- declineBooking ----------

describe("declineBooking", () => {
  it("transitions requested → declined when provider acts (BOOK-LOGIC-001)", () => {
    const booking = makeBooking();
    const result = declineBooking(booking, "provider", "prov-1");
    expect(result.updatedFields.status).toBe("declined");
  });

  it("throws when customer tries to decline (BOOK-LOGIC-001)", () => {
    const booking = makeBooking();
    expect(() => declineBooking(booking, "customer", "cust-1")).toThrow(
      BookingAuthorizationError,
    );
  });

  it("writes a history entry (BOOK-LOGIC-004)", () => {
    const booking = makeBooking();
    const result = declineBooking(booking, "provider", "prov-1");
    expect(result.historyEntry.toStatus).toBe("declined");
  });
});

// ---------- cancelBooking ----------

describe("cancelBooking", () => {
  it("customer may cancel a requested booking (BOOK-LOGIC-002)", () => {
    const booking = makeBooking({ status: "requested" });
    const result = cancelBooking(booking, "customer", "cust-1", "Changed my mind");
    expect(result.updatedFields.status).toBe("cancelled");
    expect(result.updatedFields.cancellationReason).toBe("Changed my mind");
  });

  it("provider may NOT cancel a requested booking (BOOK-LOGIC-002)", () => {
    const booking = makeBooking({ status: "requested" });
    expect(() =>
      cancelBooking(booking, "provider", "prov-1", "Can't make it"),
    ).toThrow(BookingAuthorizationError);
  });

  it("customer may cancel an accepted booking", () => {
    const booking = makeBooking({ status: "accepted" });
    const result = cancelBooking(booking, "customer", "cust-1", "Emergency");
    expect(result.updatedFields.status).toBe("cancelled");
  });

  it("provider may cancel an accepted booking", () => {
    const booking = makeBooking({ status: "accepted" });
    const result = cancelBooking(booking, "provider", "prov-1", "Double booked");
    expect(result.updatedFields.status).toBe("cancelled");
  });

  it("requires a cancellation reason (BOOK-LOGIC-006)", () => {
    const booking = makeBooking({ status: "accepted" });
    expect(() => cancelBooking(booking, "customer", "cust-1", "")).toThrow(
      BookingTransitionError,
    );
  });

  it("cannot cancel a completed booking (BOOK-LOGIC-003)", () => {
    const booking = makeBooking({ status: "completed" });
    expect(() =>
      cancelBooking(booking, "customer", "cust-1", "Too late"),
    ).toThrow(BookingTransitionError);
  });

  it("writes a history entry with fromStatus (BOOK-LOGIC-004)", () => {
    const booking = makeBooking({ status: "accepted" });
    const result = cancelBooking(booking, "provider", "prov-1", "Unavailable");
    expect(result.historyEntry.fromStatus).toBe("accepted");
    expect(result.historyEntry.toStatus).toBe("cancelled");
  });
});

// ---------- completeBooking ----------

describe("completeBooking", () => {
  it("transitions accepted → completed when provider acts (BOOK-LOGIC-009)", () => {
    const booking = makeBooking({ status: "accepted" });
    const result = completeBooking(booking, "provider", "prov-1");
    expect(result.updatedFields.status).toBe("completed");
  });

  it("transitions accepted → completed when system acts", () => {
    const booking = makeBooking({ status: "accepted" });
    const result = completeBooking(booking, "system", "system");
    expect(result.updatedFields.status).toBe("completed");
  });

  it("throws when booking is not accepted (BOOK-LOGIC-009)", () => {
    const booking = makeBooking({ status: "requested" });
    expect(() => completeBooking(booking, "provider", "prov-1")).toThrow(
      BookingTransitionError,
    );
  });

  it("throws when customer tries to complete", () => {
    const booking = makeBooking({ status: "accepted" });
    expect(() => completeBooking(booking, "customer", "cust-1")).toThrow(
      BookingAuthorizationError,
    );
  });

  it("writes a history entry (BOOK-LOGIC-004)", () => {
    const booking = makeBooking({ status: "accepted" });
    const result = completeBooking(booking, "provider", "prov-1");
    expect(result.historyEntry.fromStatus).toBe("accepted");
    expect(result.historyEntry.toStatus).toBe("completed");
    expect(result.historyEntry.actorType).toBe("provider");
  });
});

// ---------- Auto-expiry ----------

describe("evaluateAutoExpiry", () => {
  function makeConfig(hours: number) {
    return new InMemoryConfigStore({
      [CONFIG_KEYS.BOOKING_AUTO_EXPIRY_HOURS]: hours,
    });
  }

  it("returns a declined transition when the window has passed (BOOK-LOGIC-005)", async () => {
    const booking = makeBooking({
      status: "requested",
      requestedAt: new Date("2026-06-01T10:00:00Z"),
    });
    const now = new Date("2026-06-03T12:00:00Z"); // 50 hours later
    const config = makeConfig(48);
    const result = await evaluateAutoExpiry(booking, now, config);
    expect(result).not.toBeNull();
    expect(result!.updatedFields.status).toBe("declined");
    expect(result!.historyEntry.actorType).toBe("system");
  });

  it("returns null when the window has not yet passed", async () => {
    const booking = makeBooking({
      status: "requested",
      requestedAt: new Date("2026-06-01T10:00:00Z"),
    });
    const now = new Date("2026-06-02T09:00:00Z"); // 23 hours later
    const config = makeConfig(48);
    const result = await evaluateAutoExpiry(booking, now, config);
    expect(result).toBeNull();
  });

  it("returns null for a non-requested booking", async () => {
    const booking = makeBooking({ status: "accepted" });
    const now = new Date("2026-06-10T00:00:00Z");
    const config = makeConfig(48);
    const result = await evaluateAutoExpiry(booking, now, config);
    expect(result).toBeNull();
  });
});
