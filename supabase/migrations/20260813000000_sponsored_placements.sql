-- =============================================================================
-- Sponsored & featured inventory (Batch C)
-- =============================================================================
--
-- Rule 2 (see build spec): sponsored placement is bought time, never bought
-- leads or rank. Every placement is a flat-rate, time-boxed reservation of a
-- labelled slot — it never reorders the organic list. Enforcement of that
-- rule lives in application code (lib/domain/sponsored.ts), not just here,
-- but the schema itself has no per-lead/per-click/auction fields by design —
-- there is nowhere to store a bid or a cost-per-click, on purpose.

CREATE TYPE sponsored_placement_type AS ENUM (
  'category_city_feature',
  'floating_box',
  'search_top_slot'
);

CREATE TYPE sponsored_placement_source AS ENUM ('purchased', 'rescue_grant');

CREATE TYPE sponsored_placement_status AS ENUM ('active', 'paused', 'expired', 'cancelled');

CREATE TABLE sponsored_placements (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  provider_id      TEXT NOT NULL REFERENCES providers (id) ON DELETE CASCADE,
  placement_type   sponsored_placement_type NOT NULL,
  -- scope: category and/or city this placement applies to. Both null means
  -- "site-wide" — the only placement_type that should ever leave both null
  -- is floating_box (category_city_feature and search_top_slot are always
  -- scoped to at least one of category_id/city).
  category_id      TEXT REFERENCES provider_categories (id),
  city             TEXT,
  starts_at        TIMESTAMPTZ NOT NULL,
  ends_at          TIMESTAMPTZ NOT NULL,
  source           sponsored_placement_source NOT NULL,
  price_paid       INTEGER, -- Rands. NULL for rescue_grant (never charged).
  status           sponsored_placement_status NOT NULL DEFAULT 'active',
  -- Set when an eligibility re-check pauses a placement mid-flight (C.2) —
  -- records how many seconds of the reserved window were unused so it can be
  -- credited back when the provider becomes eligible again.
  paused_at            TIMESTAMPTZ,
  credited_seconds      INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (ends_at > starts_at),
  CHECK (source = 'purchased' OR price_paid IS NULL)
);

CREATE INDEX sponsored_placements_active_idx
  ON sponsored_placements (placement_type, status, starts_at, ends_at);
CREATE INDEX sponsored_placements_provider_id_idx ON sponsored_placements (provider_id);
CREATE INDEX sponsored_placements_category_city_idx
  ON sponsored_placements (category_id, city) WHERE status = 'active';

CREATE TRIGGER sponsored_placements_set_updated_at
  BEFORE UPDATE ON sponsored_placements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE sponsored_placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers read own sponsored placements"
  ON sponsored_placements FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );

-- ---------------------------------------------------------------------------
-- Config: reserve percentage, density cap, min rating threshold, and
-- placement pricing all live in config/sponsored-placements.json (a
-- repo-tracked JSON file), not platform_config — see lib/sponsored-config.ts.
-- Deliberately not seeded into the DB here to avoid two sources of truth.
-- ---------------------------------------------------------------------------
