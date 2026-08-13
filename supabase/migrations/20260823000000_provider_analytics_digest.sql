-- Provider analytics dashboard and weekly digest preferences.
--
-- Adds profile_viewed to the existing funnel_events vocabulary so profile
-- and service views can both be read from the funnel table going forward.
-- Adds provider-owned digest preferences and a service-role email queue.

ALTER TABLE funnel_events
  DROP CONSTRAINT IF EXISTS funnel_events_type_check;

ALTER TABLE funnel_events
  ADD CONSTRAINT funnel_events_type_check CHECK (
    event_type IN (
      'search_performed',
      'profile_viewed',
      'service_viewed',
      'review_submitted'
    )
  );

CREATE TABLE IF NOT EXISTS provider_notification_preferences (
  provider_id              TEXT PRIMARY KEY REFERENCES providers(id) ON DELETE CASCADE,
  analytics_digest_opt_in  BOOLEAN NOT NULL DEFAULT TRUE,
  unsubscribe_token        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_notification_preferences_unsubscribe_token_idx
  ON provider_notification_preferences(unsubscribe_token);

DROP TRIGGER IF EXISTS provider_notification_preferences_set_updated_at ON provider_notification_preferences;
CREATE TRIGGER provider_notification_preferences_set_updated_at
  BEFORE UPDATE ON provider_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE provider_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "providers read own notification preferences" ON provider_notification_preferences;
CREATE POLICY "providers read own notification preferences"
  ON provider_notification_preferences FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );

DROP POLICY IF EXISTS "providers update own notification preferences" ON provider_notification_preferences;
CREATE POLICY "providers update own notification preferences"
  ON provider_notification_preferences FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );

CREATE TABLE IF NOT EXISTS analytics_digest_queue (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  provider_id      TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  to_email         TEXT NOT NULL,
  recipient_name   TEXT,
  period_start     TIMESTAMPTZ NOT NULL,
  period_end       TIMESTAMPTZ NOT NULL,
  scheduled_for    TIMESTAMPTZ NOT NULL,
  status           TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sending', 'sent', 'skipped', 'failed')),
  attempts         INTEGER NOT NULL DEFAULT 0,
  sent_at          TIMESTAMPTZ,
  last_error       TEXT,
  idempotency_key  TEXT NOT NULL UNIQUE,
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analytics_digest_queue_status_scheduled_idx
  ON analytics_digest_queue(status, scheduled_for, created_at);

CREATE INDEX IF NOT EXISTS analytics_digest_queue_provider_period_idx
  ON analytics_digest_queue(provider_id, period_start, period_end);

DROP TRIGGER IF EXISTS analytics_digest_queue_set_updated_at ON analytics_digest_queue;
CREATE TRIGGER analytics_digest_queue_set_updated_at
  BEFORE UPDATE ON analytics_digest_queue
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE analytics_digest_queue ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE, SELECT ON analytics_digest_queue FROM anon, authenticated;
