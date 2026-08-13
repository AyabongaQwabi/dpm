import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

describe('custom quote v1 architecture', () => {
  it('adds quote tables without adding a pre-booking file primitive', () => {
    const migration = read('supabase/migrations/20260824000000_custom_quotes.sql')

    expect(migration).toContain('ADD COLUMN IF NOT EXISTS accepts_custom_quotes BOOLEAN NOT NULL DEFAULT FALSE')
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS quote_requests')
    expect(migration).toContain('decline_reason TEXT')
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS quotes')
    expect(migration).not.toContain('quote_files')
    expect(migration).not.toContain('storage.buckets')
  })

  it('keeps quote requests tied to a real provider-owned service', () => {
    const migration = read('supabase/migrations/20260824000000_custom_quotes.sql')

    expect(migration).toContain('service_id  TEXT NOT NULL REFERENCES services(id)')
    expect(migration).toContain('quote_requests_service_provider_fkey')
    expect(migration).not.toContain('category')
  })

  it('enables RLS for quote data', () => {
    const migration = read('supabase/migrations/20260824000000_custom_quotes.sql')

    expect(migration).toContain('ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY')
    expect(migration).toContain('ALTER TABLE quotes ENABLE ROW LEVEL SECURITY')
    expect(migration).toContain('customers read own quote requests')
    expect(migration).toContain('providers read own quotes')
  })

  it('allows publishing with article plus packages or article plus custom quotes', () => {
    const actions = read('lib/actions/services.ts')

    expect(actions).toContain("select('article_json, is_published, accepts_custom_quotes')")
    expect(actions).toContain("!!svc?.article_json && ((pkgCount ?? 0) > 0 || !!svc?.accepts_custom_quotes)")
  })

  it('branches public service displays on the explicit custom quote flag', () => {
    expect(read('lib/public-data.ts')).toContain('acceptsCustomQuotes: !!service.accepts_custom_quotes')
    expect(read('components/ServiceListingCard.tsx')).toContain('service.acceptsCustomQuotes && packages.length === 0')
    expect(read('app/(public)/providers/service/[slug]/page.tsx')).toContain('service.acceptsCustomQuotes && service.packages.length === 0')
  })

  it('supersedes the active quote before issuing a revised quote', () => {
    const actions = read('lib/actions/custom-quotes.ts')

    expect(actions).toContain(".update({ status: 'superseded' })")
    expect(actions).toContain(".eq('status', 'sent')")
    expect(actions).toContain("line_items: lineItems.lineItems")
    expect(actions).toContain("total_amount: lineItems.totalAmount")
  })

  it('accepts quotes by flowing into the ordinary booking creation and lifecycle primitives', () => {
    const actions = read('lib/actions/custom-quotes.ts')
    const creation = read('lib/actions/booking-creation.ts')
    const checkout = read('app/(public)/checkout/page.tsx')

    expect(actions).toContain('calculateQuoteBookingCommission')
    expect(actions).toContain('createBookingWithCredits')
    expect(actions).toContain(".update({ status: 'accepted', booking_id: booking.bookingId })")
    expect(actions).toContain(".update({ quote_request_id: request.id, quote_id: quote.id })")

    expect(creation).toContain("admin.rpc('create_booking_with_credit_spend'")
    expect(creation).toContain("admin.from('message_threads').insert")
    expect(creation).toContain('snapshotBookingRequirements')
    expect(creation).toContain('sendBookingCreatedEmails')

    expect(checkout).toContain('createBookingWithCredits')
    expect(checkout).not.toContain("admin.rpc('create_booking_with_credit_spend'")
  })

  it('declining an issued quote reopens the quote request', () => {
    const actions = read('lib/actions/custom-quotes.ts')

    expect(actions).toContain(".update({ status: 'declined', decline_reason: reason.slice(0, 500) })")
    expect(actions).toContain(".update({ status: 'requested', decline_reason: null })")
  })

  it('quote-sent email points to the dashboard without quote totals or payment links', () => {
    const emails = read('lib/email/resend.ts')
    const orchestration = read('lib/custom-quote-emails.ts')

    expect(orchestration).toContain('/customer-account/quotes#')
    expect(emails).toContain('sendCustomQuoteReadyCustomerEmail')
    expect(emails).toContain('Review your quote')
    expect(emails).not.toContain('Accept and pay')
    expect(emails).not.toContain('Quote total')
  })
})
