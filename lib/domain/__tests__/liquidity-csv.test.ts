import { describe, expect, it } from 'vitest'
import { toCsv, type LeakageSampleRow } from '../liquidity'

const ROW: LeakageSampleRow = {
  bookingId: 'b1',
  customerName: 'Jane Doe',
  customerEmail: 'jane@example.com',
  customerPhone: '0821234567',
  providerBusinessName: 'Acme Plumbing',
  serviceTitle: 'Geyser repair',
  city: 'Cape Town',
  startedAt: '2026-08-01T00:00:00Z',
}

describe('toCsv', () => {
  it('emits a header row followed by one row per booking', () => {
    const csv = toCsv([ROW])
    const lines = csv.split('\n')
    expect(lines[0]).toBe(
      'booking_id,customer_name,customer_email,customer_phone,provider_business_name,service_title,city,started_at',
    )
    expect(lines[1]).toBe(
      'b1,Jane Doe,jane@example.com,0821234567,Acme Plumbing,Geyser repair,Cape Town,2026-08-01T00:00:00Z',
    )
  })

  it('quotes and escapes values containing commas or quotes', () => {
    const csv = toCsv([{ ...ROW, providerBusinessName: 'Smith, "The Fixer" Co' }])
    expect(csv).toContain('"Smith, ""The Fixer"" Co"')
  })

  it('renders a missing phone as an empty field, not the literal null', () => {
    const csv = toCsv([{ ...ROW, customerPhone: null }])
    expect(csv).toContain('jane@example.com,,Acme Plumbing')
  })

  it('returns just the header for an empty sample', () => {
    const csv = toCsv([])
    expect(csv.split('\n')).toHaveLength(1)
  })
})
