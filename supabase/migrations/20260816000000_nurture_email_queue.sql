-- =============================================================================
-- New account nurture email queue
-- =============================================================================
--
-- Vercel Hobby can run cron jobs at most once per day, so nurture timing is
-- DB-backed instead of cron-backed. Signup/onboarding actions enqueue the full
-- sequence once; a single daily cron drains due rows in a bounded batch.

CREATE TABLE nurture_email_queue (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  audience         TEXT NOT NULL CHECK (audience IN ('provider', 'customer')),
  recipient_id     TEXT NOT NULL,
  to_email         TEXT NOT NULL,
  recipient_name   TEXT,
  sequence_key     TEXT NOT NULL,
  step_key         TEXT NOT NULL,
  step_index       INTEGER NOT NULL,
  scheduled_for    TIMESTAMPTZ NOT NULL,
  status           TEXT NOT NULL DEFAULT 'queued'
                   CHECK (status IN ('queued', 'sending', 'sent', 'skipped', 'failed')),
  attempts         INTEGER NOT NULL DEFAULT 0,
  sent_at          TIMESTAMPTZ,
  last_error       TEXT,
  idempotency_key  TEXT NOT NULL UNIQUE,
  metadata         JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX nurture_email_queue_due_idx
  ON nurture_email_queue (status, scheduled_for, created_at)
  WHERE status = 'queued';

CREATE INDEX nurture_email_queue_recipient_idx
  ON nurture_email_queue (audience, recipient_id, sequence_key);

CREATE TRIGGER nurture_email_queue_set_updated_at
  BEFORE UPDATE ON nurture_email_queue
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE nurture_email_queue ENABLE ROW LEVEL SECURITY;

-- No client policies on purpose. This is an internal delivery ledger written
-- by server actions and cron with the service-role client only.
