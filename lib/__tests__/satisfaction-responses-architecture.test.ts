import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

const MIGRATION = 'supabase/migrations/20260822000000_satisfaction_responses.sql'

describe('satisfaction_responses / nps_survey_queue — additive', () => {
  const migration = read(MIGRATION)

  it('creates both tables additively', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS nps_survey_queue')
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS satisfaction_responses')
  })

  it('drops no existing column or table', () => {
    expect(migration).not.toMatch(/DROP\s+COLUMN/i)
    expect(migration).not.toMatch(/DROP\s+TABLE/i)
  })

  it('never alters or writes into nurture_email_queue', () => {
    expect(migration).not.toMatch(/ALTER TABLE nurture_email_queue/i)
    expect(migration).not.toMatch(/INSERT INTO nurture_email_queue/i)
  })
})

describe('satisfaction_responses — side is never blendable by construction', () => {
  const migration = read(MIGRATION)

  it('constrains side to customer|provider on both tables', () => {
    const occurrences = migration.match(/CHECK \(side IN \('customer', 'provider'\)\)/g) ?? []
    expect(occurrences.length).toBe(2)
  })

  it('requires a booking_id for every customer-side row on both tables', () => {
    expect(migration).toContain('nps_survey_queue_customer_has_booking')
    expect(migration).toContain('satisfaction_responses_customer_has_booking')
  })

  it('constrains score to the 0-10 NPS range', () => {
    expect(migration).toContain('CHECK (score BETWEEN 0 AND 10)')
  })
})

describe('satisfaction_responses — one response per survey send', () => {
  it('has a partial unique index on survey_id', () => {
    expect(read(MIGRATION)).toContain('satisfaction_responses_survey_unique')
  })
})

describe('satisfaction_responses / nps_survey_queue — RLS', () => {
  const migration = read(MIGRATION)

  it('enables RLS on both tables', () => {
    expect(migration).toContain('ALTER TABLE nps_survey_queue ENABLE ROW LEVEL SECURITY')
    expect(migration).toContain('ALTER TABLE satisfaction_responses ENABLE ROW LEVEL SECURITY')
  })

  it('grants no anon/authenticated access on either table — service-role only', () => {
    expect(migration).toContain(
      'REVOKE INSERT, UPDATE, DELETE, SELECT ON nps_survey_queue FROM anon, authenticated',
    )
    expect(migration).toContain(
      'REVOKE INSERT, UPDATE, DELETE, SELECT ON satisfaction_responses FROM anon, authenticated',
    )
  })

  it('defines no public SELECT/INSERT policy on either table', () => {
    expect(migration).not.toMatch(/CREATE POLICY[^;]*ON nps_survey_queue/i)
    expect(migration).not.toMatch(/CREATE POLICY[^;]*ON satisfaction_responses/i)
  })
})
