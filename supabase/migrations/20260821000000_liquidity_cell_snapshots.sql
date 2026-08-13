-- Liquidity instrumentation, part 2: nightly liquid-cell rollup.
--
-- One row per (category, city) per rollup run, written by the
-- /api/cron/liquidity-rollup job. category is a provider_categories.slug,
-- city is the free-text providers.location_city value verbatim — same
-- resolved-identity convention as funnel_events (no cities table exists in
-- this schema). Historical rows are kept (not upserted in place) so a
-- future dashboard can show a trend, not just the latest snapshot.
--
-- Admin-only, same access model as funnel_events: RLS enabled, all
-- anon/authenticated access revoked, reads/writes go through the
-- service-role client only.
--
-- Idempotent and strictly additive.

CREATE TABLE IF NOT EXISTS liquidity_cell_snapshots (
  id                        TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  category                  TEXT        NOT NULL,
  city                      TEXT        NOT NULL,
  provider_count            INTEGER     NOT NULL,
  completed_bookings_30d    INTEGER     NOT NULL,
  response_rate_24h         NUMERIC(5,4),
  median_response_minutes   INTEGER,
  search_performed_count    INTEGER     NOT NULL DEFAULT 0,
  service_viewed_count      INTEGER     NOT NULL DEFAULT 0,
  booking_started_count     INTEGER     NOT NULL DEFAULT 0,
  booking_completed_count   INTEGER     NOT NULL DEFAULT 0,
  is_liquid                 BOOLEAN     NOT NULL,
  computed_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS liquidity_cell_snapshots_category_city_computed_idx
  ON liquidity_cell_snapshots(category, city, computed_at DESC);

ALTER TABLE liquidity_cell_snapshots ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE, SELECT ON liquidity_cell_snapshots FROM anon, authenticated;
