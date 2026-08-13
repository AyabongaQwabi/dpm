# Custom Quote to Booking Flow

## Purpose

Custom quotes let a customer request bespoke pricing from a real provider-owned service, then accept the provider's quote into the normal ServicePros booking lifecycle. The goal is to support work that cannot honestly be sold from a fixed package price, while keeping the commercial exit on-platform.

The flow is intentionally narrow for v1:

- Quote requests are text-only. Pre-booking file exchange is deferred because the existing file primitive is booking-scoped.
- Quote requests reference a real `services` row through `quote_requests.service_id`; no synthetic services or synthetic packages are created.
- `services.accepts_custom_quotes` lets a real service publish with article content plus either fixed packages or custom-quote support.
- Provider quotes use structured line items: description, quantity, unit price, and computed line/quote totals.
- Accepting a quote creates an ordinary booking through the shared booking creation helper, debiting the customer credit wallet through the existing `create_booking_with_credit_spend` RPC.

After acceptance, the booking is deliberately not special. Existing booking messages, booking files, status transitions, completion, payout, and review gating continue to apply.

## Main Pieces

- `supabase/migrations/20260824000000_custom_quotes.sql`
  Adds `services.accepts_custom_quotes`, quote request/quote statuses, `quote_requests`, `quotes`, RLS policies, and booking back-references to accepted quotes.

- `lib/actions/booking-creation.ts`
  Shared booking creation path used by both checkout and quote acceptance. This owns the wallet RPC call, message thread creation, requirement snapshot, booking-created emails, and revalidation.

- `lib/actions/custom-quotes.ts`
  Creates quote requests, lets providers issue/revise/decline requests, lets customers accept/decline issued quotes, and performs server-side expiry validation.

- `app/provider-dashboard/quotes/page.tsx`
  Provider quote builder. It displays the customer description and lets the provider issue structured line-item quotes.

- `app/customer-account/quotes/page.tsx`
  Customer quote review page. Customers accept quotes into bookings or decline them with a reason.

- `components/PackageSelector.tsx`
  For quote-only services, shows a quote request form instead of a fixed-price package selector.

- `lib/commission-context.ts`
  Adds the quote booking commission path. Quote bookings skip package sale history and Discount 4 Discount eligibility, but still use bracket, ceiling, provider temporary reduction, and stacking-floor logic.

## Important Decisions

- Expiry is lazy-checked for v1. The customer quote page marks expired active quotes when loaded, and `acceptCustomQuote()` repeats the server-side expiry check before creating a booking.
- Declining an issued quote reopens the quote request by setting `quote_requests.status = requested`, so the provider can respond again.
- Quote-sent email is only a notification. It links back to `/customer-account/quotes` and does not include quote totals or payment mechanics.
- `TODO(aya): confirm` remains on quote validity, line-item limits, and public quote CTA copy.
- `TODO(aya): legal review` remains on quote-related email terms copy.

## How To Test

Run the automated checks:

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test
```

`pnpm typecheck` is not defined in this repository, so `pnpm exec tsc --noEmit` is the current equivalent.

Manual flow:

1. In the provider dashboard, create or edit a service.
2. Add an article and enable **Accept custom quote requests**.
3. Publish the service with no packages, or leave packages in place to support both fixed-price booking and custom quotes.
4. As a customer, open the service page and submit the custom quote request form.
5. As the provider, open `/provider-dashboard/quotes`, confirm the customer description is visible, add line items, and send a quote.
6. As the customer, open `/customer-account/quotes`, review the line items, and accept the quote.
7. If wallet balance is short, confirm the flow redirects to `/customer-account/credits?amount={shortfall}`.
8. With enough credits, confirm acceptance redirects to the normal booking detail page.
9. Continue the booking through the existing provider accept/start/complete and customer confirm/review paths.

Regression checks:

- A quote-only public service must not show `R0` or a blank price; it should render custom-quote copy.
- Revising a provider quote must mark the previous `sent` quote as `superseded`.
- Declining an issued quote as the customer must reopen the request for provider response.
- Expired quotes must not create bookings.
- Accepted quote bookings must have `package_id = null` and still use the ordinary booking lifecycle.
