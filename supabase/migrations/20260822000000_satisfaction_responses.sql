-- Liquidity instrumentation, part 3: split satisfaction tracking.
--
-- Two independent survey flows — customer NPS at booking completion,
-- provider NPS at day 30 post-claim and quarterly thereafter — landing in
-- one satisfaction_responses table but never blended: every read must
-- filter on `side`. There is no existing NPS/promoter-score concept
-- anywhere in this schema (reviews are 1-5 star + sub-ratings, a different
-- instrument); this is net-new.
--
-- Delivery is a dedicated nps_survey_queue, not the existing
-- nurture_email_queue: that table's config (lib/nurture-emails-config.ts)
-- keys one sequence per audience ('provider' | 'customer' exactly), so
-- reusing it for a second, independent sequence per audience would collide
-- without a config refactor. A small parallel queue, same
-- schedule/idempotency/retry shape, avoids touching the onboarding system.
--
-- Idempotent and strictly additive.

CREATE TABLE IF NOT EXISTS nps_survey_queue (
  id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  side             TEXT        NOT NULL CHECK (side IN ('customer', 'provider')),
  recipient_id     TEXT        NOT NULL,
  to_email         TEXT        NOT NULL,
  recipient_name   TEXT,
  booking_id       TEXT        REFERENCES bookings(id) ON DELETE CASCADE,
  survey_token     TEXT        NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  scheduled_for    TIMESTAMPTZ NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'queued'
                   CHECK (status IN ('queued', 'sending', 'sent', 'skipped', 'failed')),
  attempts         INTEGER     NOT NULL DEFAULT 0,
  sent_at          TIMESTAMPTZ,
  last_error       TEXT,
  idempotency_key  TEXT        NOT NULL UNIQUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT nps_survey_queue_customer_has_booking CHECK (
    side <> 'customer' OR booking_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS nps_survey_queue_due_idx
  ON nps_survey_queue(status, scheduled_for)
  WHERE status = 'queued';

ALTER TABLE nps_survey_queue ENABLE ROW LEVEL SECURITY;

-- Same access model as nurture_email_queue: no anon/authenticated access,
-- service-role only (cron sender + enqueue calls).
REVOKE INSERT, UPDATE, DELETE, SELECT ON nps_survey_queue FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS satisfaction_responses (
  id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  side         TEXT        NOT NULL CHECK (side IN ('customer', 'provider')),
  score        INTEGER     NOT NULL CHECK (score BETWEEN 0 AND 10),
  verbatim     TEXT,
  category     TEXT,
  city         TEXT,
  booking_id   TEXT        REFERENCES bookings(id) ON DELETE SET NULL,
  survey_id    TEXT        REFERENCES nps_survey_queue(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT satisfaction_responses_customer_has_booking CHECK (
    side <> 'customer' OR booking_id IS NOT NULL
  )
);

-- One response per survey send — a customer or provider can't submit twice
-- against the same queued survey.
CREATE UNIQUE INDEX IF NOT EXISTS satisfaction_responses_survey_unique
  ON satisfaction_responses(survey_id)
  WHERE survey_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS satisfaction_responses_side_created_idx
  ON satisfaction_responses(side, created_at DESC);

CREATE INDEX IF NOT EXISTS satisfaction_responses_category_city_idx
  ON satisfaction_responses(category, city);

ALTER TABLE satisfaction_responses ENABLE ROW LEVEL SECURITY;

-- Admin-only, same access model as funnel_events and liquidity_cell_snapshots.
REVOKE INSERT, UPDATE, DELETE, SELECT ON satisfaction_responses FROM anon, authenticated;
