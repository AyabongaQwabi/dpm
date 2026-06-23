-- =============================================================================
-- Provider Dashboard V2
-- Adds: service articles, pricing packages (with is_default flag),
--       package-tagged reviews, social_links + languages on providers,
--       portfolio (optional), service_type enum, messages + threads.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Provider profile additions (fixed columns, uniform across all provider types)
-- ---------------------------------------------------------------------------

-- social_links: [{platform: string, url: string}]
ALTER TABLE providers ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '[]';

-- languages: ["English", "Zulu", ...]
ALTER TABLE providers ADD COLUMN IF NOT EXISTS languages JSONB NOT NULL DEFAULT '[]';

-- portfolio: [{title, description, image_url}] — optional
ALTER TABLE providers ADD COLUMN IF NOT EXISTS portfolio JSONB NOT NULL DEFAULT '[]';

-- ---------------------------------------------------------------------------
-- Service article (compulsory for publishing a service)
-- Tiptap JSON stored as JSONB; plain-text excerpt for search/display
-- ---------------------------------------------------------------------------

ALTER TABLE services ADD COLUMN IF NOT EXISTS article_json JSONB;
ALTER TABLE services ADD COLUMN IF NOT EXISTS article_text TEXT;

-- service_type drives CTA wording (time-based = Book/Request, fixed = Order/Get Started)
CREATE TYPE service_type AS ENUM ('time_based', 'fixed_deliverable');
ALTER TABLE services ADD COLUMN IF NOT EXISTS service_type service_type NOT NULL DEFAULT 'fixed_deliverable';

-- is_published: a service is only visible on the public profile when it has
-- at least one package AND an article AND is explicitly published
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------------------------------------------------------------------------
-- Pricing packages
-- ---------------------------------------------------------------------------

CREATE TABLE service_packages (
  id               TEXT          PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  service_id       TEXT          NOT NULL REFERENCES services (id) ON DELETE CASCADE,
  name             TEXT          NOT NULL,
  description      TEXT          NOT NULL DEFAULT '',
  price            NUMERIC(10,2) NOT NULL,
  discount_type    discount_type NOT NULL DEFAULT 'none',
  discount_amount  NUMERIC(10,2),
  offerings        JSONB         NOT NULL DEFAULT '[]',
  requirements     TEXT          NOT NULL DEFAULT '',
  requirement_file_slots JSONB   NOT NULL DEFAULT '[]',
  delivery_time    TEXT          NOT NULL DEFAULT '',
  is_default       BOOLEAN       NOT NULL DEFAULT FALSE,
  display_order    INTEGER       NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX service_packages_service_id_idx ON service_packages (service_id);

-- Enforce exactly one is_default per service at the DB level
CREATE UNIQUE INDEX service_packages_one_default_per_service
  ON service_packages (service_id)
  WHERE is_default = TRUE;

CREATE TRIGGER service_packages_set_updated_at
  BEFORE UPDATE ON service_packages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Reviews: add package reference (display metadata only, not a ranking input)
-- ---------------------------------------------------------------------------

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS package_id TEXT REFERENCES service_packages (id) ON DELETE SET NULL;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS service_id TEXT REFERENCES services (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS reviews_service_id_idx ON reviews (service_id);

-- ---------------------------------------------------------------------------
-- Messages / threads
-- ---------------------------------------------------------------------------

CREATE TABLE message_threads (
  id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  provider_id  TEXT        NOT NULL REFERENCES providers (id) ON DELETE CASCADE,
  customer_id  TEXT        NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  service_id   TEXT        NOT NULL REFERENCES services (id) ON DELETE CASCADE,
  booking_id   TEXT        REFERENCES bookings (id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id)
);

CREATE INDEX message_threads_provider_id_idx ON message_threads (provider_id);
CREATE INDEX message_threads_customer_id_idx ON message_threads (customer_id);

CREATE TRIGGER message_threads_set_updated_at
  BEFORE UPDATE ON message_threads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TYPE message_actor AS ENUM ('provider', 'customer');

CREATE TABLE messages (
  id         TEXT          PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  thread_id  TEXT          NOT NULL REFERENCES message_threads (id) ON DELETE CASCADE,
  actor      message_actor NOT NULL,
  body       TEXT          NOT NULL,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX messages_thread_id_created_at_idx ON messages (thread_id, created_at);

-- ---------------------------------------------------------------------------
-- Platform config: recommended services tuning keys
-- ---------------------------------------------------------------------------

INSERT INTO platform_config (key, value, description) VALUES
  ('min_reviews_for_recommendation', '5', 'Minimum review count before a service is eligible for recommendation'),
  ('recommendation_weight_recency_rating',  '0.35', 'Weight for recency-weighted average rating'),
  ('recommendation_weight_booking_volume',  '0.25', 'Weight for booking volume signal'),
  ('recommendation_weight_reliability',     '0.25', 'Weight for provider reliability penalty'),
  ('recommendation_weight_review_ratio',    '0.15', 'Weight for completion-to-review ratio trust signal'),
  ('recommendation_recency_half_life_days', '180',  'Half-life in days for recency decay on review ratings')
ON CONFLICT (key) DO NOTHING;
