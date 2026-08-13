import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

const ENUM_MIGRATION = 'supabase/migrations/20260818000000_booking_lifecycle.sql'
const TABLES_MIGRATION = 'supabase/migrations/20260818000001_booking_lifecycle_tables.sql'
const REVIEWS_MIGRATION = 'supabase/migrations/20260818000002_reviews_and_aggregates.sql'

// The four new tables/objects that must never ship without RLS.
const NEW_RLS_TABLES = [
  'booking_status_history',
  'booking_requirements',
  'booking_messages',
  'booking_files',
]

describe('booking lifecycle — status vocabulary', () => {
  const migration = read(ENUM_MIGRATION)

  it('adds the three new enum values additively', () => {
    for (const value of ['in_progress', 'completed_by_provider', 'disputed']) {
      expect(migration).toContain(`ALTER TYPE booking_status ADD VALUE IF NOT EXISTS '${value}'`)
    }
  })

  it('never renames or drops an existing enum value', () => {
    expect(migration).not.toContain('RENAME VALUE')
    expect(migration).not.toMatch(/DROP\s+TYPE\s+booking_status/i)
  })

  it('keeps the enum change in its own migration file', () => {
    // Postgres forbids using a new enum value in the transaction that adds it.
    const tables = read(TABLES_MIGRATION)
    expect(tables).not.toContain('ALTER TYPE booking_status')
  })

  it('drops no existing column anywhere in the new migrations', () => {
    for (const file of [ENUM_MIGRATION, TABLES_MIGRATION, REVIEWS_MIGRATION]) {
      expect(read(file), file).not.toMatch(/DROP\s+COLUMN/i)
    }
  })
})

describe('booking lifecycle — RLS on every new table', () => {
  const migration = read(TABLES_MIGRATION)

  for (const table of NEW_RLS_TABLES) {
    it(`enables RLS on ${table}`, () => {
      expect(migration).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`)
    })

    it(`scopes ${table} reads to the booking's two parties`, () => {
      const policy = migration.slice(
        migration.indexOf(`ON ${table} FOR SELECT`),
        migration.indexOf(`ON ${table} FOR SELECT`) + 700,
      )
      // Both sides matched via the project-wide auth_provider_id pattern.
      expect(policy).toContain('FROM customers WHERE auth_provider_id = auth.uid()::TEXT')
      expect(policy).toContain('FROM providers WHERE auth_provider_id = auth.uid()::TEXT')
    })
  }

  it('creates the booking-files bucket private, never public', () => {
    expect(migration).toContain("VALUES ('booking-files', 'booking-files', false")
    expect(migration).not.toContain("'booking-files', true")
  })

  it('scopes every storage policy to the booking id in the path', () => {
    for (const action of ['SELECT', 'INSERT', 'DELETE']) {
      expect(migration).toContain(`ON storage.objects FOR ${action}`)
    }
    // foldername(name)[2] is the booking id under bookings/{id}/...
    expect(migration).toContain("(storage.foldername(name))[2] IN (")
  })

  it('sets the bucket size limit to the configured 20 MB', () => {
    expect(migration).toContain('20971520')
  })

  it('exposes booking_events over the existing history table, not a parallel one', () => {
    expect(migration).toContain('CREATE OR REPLACE VIEW booking_events')
    expect(migration).toContain('actor_type AS actor_role')
    expect(migration).not.toContain('CREATE TABLE booking_events')
    // The prompt's required columns are all reachable.
    for (const column of ['booking_id', 'from_status', 'to_status', 'actor_id', 'note']) {
      expect(migration).toContain(column)
    }
  })
})

describe('booking lifecycle — single status writer', () => {
  it('routes every status write through transitionBooking', () => {
    // No caller outside the transition module may set a booking status.
    const callers = [
      'lib/actions/customer.ts',
      'lib/actions/provider-bookings.ts',
      'app/api/cron/booking-expiry/route.ts',
    ]

    for (const file of callers) {
      const source = read(file)
      expect(source, file).toContain('transitionBooking')
      // The old pattern: admin.from('bookings').update({ status: ... })
      expect(source, file).not.toMatch(/update\(\{\s*\n?\s*status:/)
    }
  })

  it('writes the audit row inside the transition, not at the call sites', () => {
    const transitions = read('lib/actions/booking-transitions.ts')
    expect(transitions).toContain("from('booking_status_history').insert")

    for (const file of ['lib/actions/customer.ts', 'lib/actions/provider-bookings.ts']) {
      expect(read(file), file).not.toContain("from('booking_status_history').insert")
    }
  })

  it('guards the status update on the from-state so retries are no-ops', () => {
    const transitions = read('lib/actions/booking-transitions.ts')
    expect(transitions).toContain(".eq('status', booking.status)")
  })

  it('reuses the existing refund path rather than duplicating it', () => {
    const transitions = read('lib/actions/booking-transitions.ts')
    expect(transitions).toContain('refundBookingCredits')
    expect(transitions).not.toContain('credit_wallet_refund')
  })

  it('creates the payout row idempotently on completion', () => {
    const transitions = read('lib/actions/booking-transitions.ts')
    expect(transitions).toContain("onConflict: 'booking_id'")
  })

  it('never lets an email failure roll back a transition', () => {
    const transitions = read('lib/actions/booking-transitions.ts')
    expect(transitions).toContain('void sendBookingLifecycleEmail')
  })
})

describe('booking lifecycle — files and downloads', () => {
  it('never exposes a storage path to the client', () => {
    const route = read('app/api/bookings/files/[id]/route.ts')
    expect(route).toContain('createSignedUrl')
    expect(route).toContain('resolveBookingParty')
  })

  it('logs downloads to the timeline as a non-status event', () => {
    const route = read('app/api/bookings/files/[id]/route.ts')
    expect(route).toContain("eventType: 'file_downloaded'")
  })

  it('validates uploads server-side, not only in the browser', () => {
    const action = read('lib/actions/booking-files.ts')
    expect(action).toContain('validateUpload')
    expect(action).toContain('resolveBookingParty')
  })

  it('soft-deletes files rather than removing the object inline', () => {
    const action = read('lib/actions/booking-files.ts')
    expect(action).toContain('deleted_at')
  })
})

describe('booking lifecycle — configuration, not hardcoded values', () => {
  const config = JSON.parse(read('config/booking-lifecycle.json'))

  it('documents every new config file in config/README.md', () => {
    expect(read('config/README.md')).toContain('booking-lifecycle.json')
  })

  it('marks the confirmed file size limit at 20 MB', () => {
    expect(config.files.maxFileSizeMb).toBe(20)
    expect(config.files.maxFileSizeMbConfirmed).toBe(true)
  })

  it('marks every unconfirmed value with a TODO(aya): confirm note', () => {
    const unconfirmed = [
      config.autoComplete,
      config.files,
      config.messaging,
      config.notifications,
      config.reviews,
    ]
    for (const section of unconfirmed) {
      expect(section._comment).toContain('TODO(aya): confirm')
    }
  })

  it('ships auto-completion disabled until the window is confirmed', () => {
    expect(config.autoComplete.enabled).toBe(false)
    expect(config.autoComplete.confirmed).toBe(false)
    expect(read('app/api/cron/booking-expiry/route.ts')).toContain('AUTO_COMPLETE_ENABLED')
  })

  it('reads limits from config in the code, never as literals', () => {
    const accessor = read('lib/booking-lifecycle-config.ts')
    expect(accessor).toContain("from '@/config/booking-lifecycle.json'")

    // The upload path must not carry its own copy of the size limit.
    const action = read('lib/actions/booking-files.ts')
    expect(action).toContain('MAX_BOOKING_FILE_SIZE_BYTES')
    expect(action).not.toMatch(/20\s*\*\s*1024\s*\*\s*1024/)
  })
})

describe('credits — no double debit, no double credit', () => {
  const wallet = read('supabase/migrations/20260702000000_credit_wallet.sql')

  it('makes a replayed Yoco webhook a no-op via the unique payment reference', () => {
    // credit_wallet_purchase returns early when the reference already exists.
    expect(wallet).toContain('SELECT 1 FROM credit_transactions WHERE paystack_ref = p_paystack_ref')
    expect(wallet).toContain('credit_transactions_paystack_ref_unique')
  })

  it('allows only one refund per booking, at the database level', () => {
    expect(wallet).toContain('credit_transactions_refund_per_booking')
    expect(wallet).toContain("WHERE type = 'refund' AND booking_id IS NOT NULL")
  })

  it('debits credits atomically with the booking insert, so a retry cannot double-spend', () => {
    expect(wallet).toContain('CREATE OR REPLACE FUNCTION create_booking_with_credit_spend')
    expect(wallet).toContain('FOR UPDATE')
    expect(wallet).toContain("RAISE EXCEPTION 'Insufficient credit balance'")
  })

  it('debits at booking time, not at completion', () => {
    // The booking row is created already 'captured' by the spend RPC.
    expect(wallet).toContain("'requested', 'captured'")
  })

  it('snapshots requirements idempotently so a retried checkout cannot duplicate them', () => {
    const snapshot = read('lib/actions/booking-requirements.ts')
    expect(snapshot).toContain('if (existing && existing.length > 0) return 0')
  })
})

describe('reviews — gating enforced in the database', () => {
  const migration = read(REVIEWS_MIGRATION)

  it('enables RLS on reviews', () => {
    expect(migration).toContain('ALTER TABLE reviews ENABLE ROW LEVEL SECURITY')
  })

  it('only lets a customer insert a review on their own completed booking', () => {
    expect(migration).toContain("b.status = 'completed'")
    expect(migration).toContain('b.customer_id = reviews.customer_id')
  })

  it('gives providers no way to delete or hide a review', () => {
    expect(migration).not.toMatch(/ON reviews FOR DELETE/i)
    // The provider-facing action flags for admin attention without changing
    // visibility or the aggregate.
    const action = read('lib/actions/reviews.ts')
    expect(action).toContain('flagged_at')
    expect(action).not.toContain("status: 'hidden'")
    expect(action).not.toContain("update({ status: 'flagged' })")
  })

  it('maintains aggregates by trigger, excluding non-published reviews', () => {
    expect(migration).toContain('CREATE TRIGGER reviews_sync_aggregates_trigger')
    expect(migration).toContain('AFTER INSERT OR UPDATE OR DELETE ON reviews')
    expect(migration).toContain("status = 'published'")
  })

  it('backfills the cached columns so they are correct immediately', () => {
    expect(migration).toContain('PERFORM recalculate_rating_aggregates(r.provider_id, r.service_id)')
  })

  it('makes search read the cached columns rather than reducing a live join', () => {
    const search = read('lib/search.ts')
    expect(search).toContain('rating_average')
    expect(search).toContain('rating_count')
    expect(search).not.toContain('reviews(rating)')
  })

  it('bounds the headline rating 1-5 without failing on legacy rows', () => {
    expect(migration).toContain('CHECK (rating BETWEEN 1 AND 5) NOT VALID')
  })
})

describe('booking lifecycle — migrations are ordered and idempotent', () => {
  it('keeps the lifecycle migrations ordered after every pre-existing one', () => {
    const files = readdirSync(join(root, 'supabase/migrations')).sort()
    expect(files.indexOf('20260818000000_booking_lifecycle.sql')).toBeGreaterThan(
      files.indexOf('20260817000000_pro_membership_cancellation_refund.sql'),
    )
    expect(files.indexOf('20260818000001_booking_lifecycle_tables.sql')).toBeGreaterThan(
      files.indexOf('20260818000000_booking_lifecycle.sql'),
    )
    expect(files.indexOf('20260818000002_reviews_and_aggregates.sql')).toBeGreaterThan(
      files.indexOf('20260818000001_booking_lifecycle_tables.sql'),
    )
  })

  it('creates tables and policies idempotently', () => {
    const migration = read(TABLES_MIGRATION)
    for (const table of ['booking_requirements', 'booking_messages', 'booking_files']) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS ${table}`)
    }
    // Every policy is dropped before being created, so a re-run is safe.
    const created = migration.match(/CREATE POLICY/g)?.length ?? 0
    const dropped = migration.match(/DROP POLICY IF EXISTS/g)?.length ?? 0
    expect(dropped).toBe(created)
  })
})
