-- Single-player supply onboarding: first-party provider analytics.
-- Public pages post narrow, provider-owned events through a server route.
-- Providers can read their own analytics in the dashboard; public visitors
-- never read or write this table directly.

CREATE TABLE IF NOT EXISTS provider_analytics_events (
  id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  provider_id  TEXT        NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  service_id   TEXT        REFERENCES services(id) ON DELETE SET NULL,
  event_type   TEXT        NOT NULL,
  source       TEXT        NOT NULL DEFAULT 'site',
  path         TEXT,
  referrer     TEXT,
  session_hash TEXT,
  user_agent   TEXT,
  metadata     JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT provider_analytics_events_type_check CHECK (
    event_type IN (
      'profile_view',
      'service_view',
      'service_booking_click',
      'profile_contact_click',
      'profile_service_click',
      'profile_share_click'
    )
  )
);

CREATE INDEX IF NOT EXISTS provider_analytics_events_provider_created_idx
  ON provider_analytics_events(provider_id, created_at DESC);

CREATE INDEX IF NOT EXISTS provider_analytics_events_provider_type_created_idx
  ON provider_analytics_events(provider_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS provider_analytics_events_service_created_idx
  ON provider_analytics_events(service_id, created_at DESC)
  WHERE service_id IS NOT NULL;

ALTER TABLE provider_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "providers read own analytics events" ON provider_analytics_events;
CREATE POLICY "providers read own analytics events"
  ON provider_analytics_events FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );

REVOKE INSERT, UPDATE, DELETE ON provider_analytics_events FROM anon, authenticated;
