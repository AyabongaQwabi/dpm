// Intentionally no route handlers here.
//
// This file was a Phase 3 placeholder for "booking creation and state
// transition API routes". Both now exist elsewhere, as server actions rather
// than API routes:
//
//   * creation   → the createBooking server action in
//                  app/(public)/checkout/page.tsx, which calls the
//                  create_booking_with_credit_spend RPC (atomic booking insert
//                  + wallet debit).
//   * transitions → transitionBooking() in lib/actions/booking-transitions.ts,
//                  the single writer of bookings.status.
//
// The file is kept only so the path does not get recreated as a second,
// competing entry point. The genuine booking HTTP routes are the file
// download endpoints under app/api/bookings/[id]/files/ and
// app/api/bookings/files/[id]/.

export {}
