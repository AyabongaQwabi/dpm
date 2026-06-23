# Customer dashboard — build prompt for Claude Code

## Context

Customer authentication is already connected. After login the customer is
currently redirected to an empty page — the first fix this prompt needs is
wiring that redirect to the customer dashboard home. The customer dashboard
lives at a protected route (e.g. /account or /dashboard/customer) — auth
guard is already in place per the existing auth setup, don't rebuild it.

The customer dashboard uses the same sidebar navigation pattern as the
provider dashboard already built, for visual and structural consistency
across the platform. Five pages total — all specified below.

---

## Page 1: Overview (the landing page after login)

Two responsibilities: show the customer a meaningful summary of where things
stand, and give them a fast path back to discovery/booking.

### Summary section
Show at a glance, without the customer needing to navigate anywhere:
- Active bookings — any booking in "requested," "accepted," or "in progress"
  state, with provider name, service name, and current status
- Pending actions — bookings the customer needs to act on specifically:
  - A booking where the provider has marked the service complete and the
    customer hasn't yet confirmed or reviewed (this is the trigger for the
    review flow — surface it here so it doesn't get forgotten)
  - Any booking in "requested" state that has been waiting more than 24
    hours without provider response (a soft nudge, not a hard escalation)

### Discovery section
A compact provider search bar (same search logic already powering the public
search page — reuse the component, don't rebuild it) plus a small row of
featured providers. These let a customer book again without navigating back
to the public site. The discovery section should feel like a convenience
feature, not the primary purpose of this page — keep it visually secondary
to the summary section above it.

---

## Page 2: My Bookings

A complete, paginated list of all the customer's bookings across every
state. This is the authoritative record of their history with the platform.

Each booking entry must show:
- Provider name and profile picture
- Service name and the specific package they booked (Basic/Standard/Premium)
- Booking status, with a human-readable label (not a raw enum value)
- Date of the booking and, where applicable, date of completion
- Amount paid (the post-discount, post-commission final price the customer
  paid — not the provider's net payout, which is not the customer's concern)
- A link to the message thread for this booking
- Where the booking is complete and no review has been left: a prominent
  "Leave a review" CTA — customers should only see this option if they
  haven't already reviewed this specific booking

Filtering: at minimum, let the customer filter by status (active, completed,
cancelled/declined). Don't over-engineer the filter UI — a simple set of
tabs or a dropdown is sufficient.

---

## Page 3: Messages

The customer-facing view of the messaging system. Structurally mirrors what
the provider sees on their Messages tab, from the other side.

Each thread is associated with a specific booking/service. The thread header
should show the provider's name, the service in question, and the booking
status — so a customer with multiple threads from the same provider (across
different services) can tell them apart at a glance.

Threads are created automatically when a customer pays for a service — this
is already specified in the provider dashboard prompt (the provider also gets
the customer added as a contact at the same moment). The customer dashboard
just needs to render those threads correctly.

No new messaging infrastructure needed — wire up to whatever messaging
system was built for the provider dashboard.

---

## Page 4: Reviews

Two sections on this page:

### Reviews I can leave
Services the customer has used (bookings in "completed" state) where no
review has been submitted yet. For each, show the service, provider, date
of completion, and a clear CTA to write the review. Once a review is
submitted for a booking, that booking disappears from this section.

### Reviews I've left
A read-only list of all reviews the customer has previously submitted. Show
the service, provider, the star rating they gave, the written review text,
and the package tier they were on when they booked (per the review data
model from the schema doc — package tag is stored on every review for
context). Let the customer see their own history but not edit or delete
reviews once submitted — the system doesn't support review editing and this
page should not imply that it does.

---

## Page 5: Account / Profile

Standard account management. Tabs within this page:

- **Personal details** — name, email, phone number. Email change should
  require re-authentication or a confirmation email before it takes effect
  (don't allow silent email changes).
- **Security** — password change. Follow Supabase Auth's standard
  password-update flow, already in place for the rest of the platform.
- **Saved providers** — if the platform supports saving/favouriting
  providers (check whether this is already in the schema; if not, flag it
  as a new schema addition needed rather than implementing it silently
  without a migration).
- **Notification preferences** — email notification toggles (booking
  updates, messages, promotional). Store preferences on the customer
  record; don't build a full notification system here, just the preference
  flags that a future notification system can read.

---

## Booking completion and review flow

This is the most process-sensitive part of the customer dashboard — get
this sequence right:

1. Provider marks a booking as complete in their dashboard.
2. Customer receives a notification (in-app, and optionally email) that
   the provider has marked the service complete — they are asked to confirm
   whether the service was delivered satisfactorily.
3. If the customer confirms: the booking moves to "completed," commission
   is triggered per the pricing model, and the customer is immediately
   prompted to leave a review. The review CTA should also appear on the
   Overview page (pending actions) and the Reviews page until it's done.
4. If the customer disputes: surface a support/chat option. Don't build a
   formal dispute resolution system here — just give the customer a way to
   contact support. The booking stays in a "disputed" or "pending
   confirmation" state until resolved manually.
5. Review gate: a customer cannot leave a review for a service they haven't
   received (booking not in completed state). Enforce this at the API level,
   not just in the UI.

---

## Design direction

Follow the established ServicePros design direction throughout (South African
landscape/craft palette, warm/human typography, the per-vertical theming
system). The customer dashboard should feel like a natural extension of the
public site the customer arrived from — not a jarring shift to a generic
SaaS admin UI. In particular:

- Provider names and profile pictures should appear wherever a provider is
  referenced — the customer's relationship is with a real person/business,
  not a booking ID.
- Status indicators should use the same badge/verification visual language
  already established on provider cards — consistent across the platform.
- Empty states (no bookings yet, no reviews yet) should be warm and
  actionable — direct the customer back to discovery rather than showing a
  dead end.

---

## Technical notes

- The customer dashboard is a protected route — auth guard is already in
  place, do not rebuild it. Just fix the post-login redirect to point here.
- All booking state transitions visible in this dashboard (confirm
  completion, initiate a dispute) must go through the existing booking
  state machine defined in the business logic specification — do not
  implement ad-hoc state changes directly on the booking record.
- Commission calculation on booking completion must use the shared
  commission functions from lib/domain/payments.ts per the pricing
  implementation prompt — not recalculated inline in the dashboard route.
- The review submission endpoint must enforce the booking-completion gate
  at the API level (not just client-side validation) consistent with
  REV-001 from the PRD.
- If "saved providers" does not exist in the current schema, add a
  migration before implementing the UI — don't store data in a field
  that doesn't exist in the database.

---

## Explicitly out of scope for this prompt

- Payment method management (adding/removing cards) — Paystack handles
  the payment UI; don't build a custom card management screen.
- A full dispute resolution workflow — surface a support contact at the
  dispute step, nothing more.
- Push notifications — notification preferences flags only, not a
  notification delivery system.
