import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

const MIGRATION = 'supabase/migrations/20260820000000_funnel_events.sql'

describe('funnel events — bookings.source / origin_domain', () => {
  const migration = read(MIGRATION)

  it('adds both columns additively, nullable/defaulted, never NOT NULL without a default', () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'site'")
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS origin_domain TEXT')
  })

  it('drops no existing column', () => {
    expect(migration).not.toMatch(/DROP\s+COLUMN/i)
  })
})

describe('funnel events — table shape', () => {
  const migration = read(MIGRATION)

  it('creates funnel_events with the closed pre-booking event vocabulary only', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS funnel_events')
    expect(migration).toContain('funnel_events_type_check')
    for (const value of ['search_performed', 'service_viewed', 'review_submitted']) {
      expect(migration).toContain(`'${value}'`)
    }
    // Booking-lifecycle steps must not be duplicated into this table.
    for (const value of ['booking_started', 'booking_paid', 'booking_completed']) {
      expect(migration).not.toContain(`'${value}'`)
    }
  })

  it('provider_id is nullable (search_performed has no provider yet)', () => {
    const createStart = migration.indexOf('CREATE TABLE IF NOT EXISTS funnel_events')
    const createBlock = migration.slice(createStart, createStart + 1200)
    expect(createBlock).toMatch(/provider_id\s+TEXT\s+REFERENCES providers\(id\) ON DELETE SET NULL/)
    expect(createBlock).not.toMatch(/provider_id\s+TEXT\s+NOT NULL/)
  })

  it('session_id is required for every event (pre-auth anonymous id)', () => {
    const createStart = migration.indexOf('CREATE TABLE IF NOT EXISTS funnel_events')
    const createBlock = migration.slice(createStart, createStart + 1200)
    expect(createBlock).toMatch(/session_id\s+TEXT\s+NOT NULL/)
  })
})

describe('funnel events — RLS', () => {
  const migration = read(MIGRATION)

  it('enables RLS on funnel_events', () => {
    expect(migration).toContain('ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY')
  })

  it('grants no anon/authenticated access at all — admin reads go through the service-role client', () => {
    expect(migration).toContain(
      'REVOKE INSERT, UPDATE, DELETE, SELECT ON funnel_events FROM anon, authenticated',
    )
  })

  it('defines no public SELECT policy on funnel_events', () => {
    expect(migration).not.toMatch(/CREATE POLICY[^;]*ON funnel_events FOR SELECT/i)
  })
})

describe('funnel events — does not touch provider_analytics_events', () => {
  it('never alters, inserts into, or extends the existing analytics table', () => {
    const migration = read(MIGRATION)
    expect(migration).not.toMatch(/ALTER TABLE provider_analytics_events/i)
    expect(migration).not.toMatch(/INSERT INTO provider_analytics_events/i)
    expect(migration).not.toMatch(/CREATE POLICY[^;]*ON provider_analytics_events/i)
  })
})
