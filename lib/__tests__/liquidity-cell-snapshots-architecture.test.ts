import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

const MIGRATION = 'supabase/migrations/20260821000000_liquidity_cell_snapshots.sql'

describe('liquidity_cell_snapshots — table shape', () => {
  const migration = read(MIGRATION)

  it('creates the table additively', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS liquidity_cell_snapshots')
  })

  it('drops no existing column or table', () => {
    expect(migration).not.toMatch(/DROP\s+COLUMN/i)
    expect(migration).not.toMatch(/DROP\s+TABLE/i)
  })

  it('keeps historical rows rather than upserting in place', () => {
    expect(migration).not.toMatch(/ON CONFLICT/i)
  })
})

describe('liquidity_cell_snapshots — RLS', () => {
  const migration = read(MIGRATION)

  it('enables RLS', () => {
    expect(migration).toContain('ALTER TABLE liquidity_cell_snapshots ENABLE ROW LEVEL SECURITY')
  })

  it('grants no anon/authenticated access — service-role only, matching funnel_events', () => {
    expect(migration).toContain(
      'REVOKE INSERT, UPDATE, DELETE, SELECT ON liquidity_cell_snapshots FROM anon, authenticated',
    )
  })

  it('defines no public SELECT policy', () => {
    expect(migration).not.toMatch(/CREATE POLICY[^;]*ON liquidity_cell_snapshots FOR SELECT/i)
  })
})
