-- =============================================================================
-- DPM baseline migration
-- Single source of truth: providers_platform_db_schema.docx Sections 2–5
-- ID strategy: gen_random_uuid() (built-in Postgres 13+, no extension needed)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums (Section 4)
-- ---------------------------------------------------------------------------

CREATE TYPE booking_status AS ENUM (
  'requested',
  'accepted',
  'declined',
  'completed',
  'cancelled'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'captured',
  'failed',
  'refunded'
);

CREATE TYPE actor_type AS ENUM (
  'customer',
  'provider',
  'system'
);

CREATE TYPE discount_type AS ENUM (
  'amount',
  'percent',
  'none'
);

CREATE TYPE input_type AS ENUM (
  'short_text',
  'rich_text',
  'number',
  'boolean',
  'single_select',
  'multi_select',
  'tag_picker',
  'image_upload',
  'file_upload'
);

-- ---------------------------------------------------------------------------
-- Dynamic schema system (PRD Section 6 / schema doc Section 2)
-- ---------------------------------------------------------------------------

CREATE TABLE provider_categories (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE provider_types (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  category_id  TEXT NOT NULL REFERENCES provider_categories (id),
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category_id, slug)
);

CREATE TABLE fields (
  id                TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  key               TEXT        NOT NULL UNIQUE,
  label             TEXT        NOT NULL,
  input_type        input_type  NOT NULL,
  options           JSONB,
  validator_config  JSONB,
  is_tag_searchable BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE form_configs (
  id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  provider_type_id TEXT        REFERENCES provider_types (id),
  category_id      TEXT        REFERENCES provider_categories (id),
  step_number      INTEGER     NOT NULL,
  step_title       TEXT        NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE form_config_fields (
  id             TEXT    PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  form_config_id TEXT    NOT NULL REFERENCES form_configs (id),
  field_id       TEXT    NOT NULL REFERENCES fields (id),
  display_order  INTEGER NOT NULL,
  is_required    BOOLEAN NOT NULL DEFAULT FALSE
);

-- ---------------------------------------------------------------------------
-- Core provider entities (Section 2 / 6.1)
-- ---------------------------------------------------------------------------

CREATE TABLE providers (
  id                TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  provider_type_id  TEXT        NOT NULL REFERENCES provider_types (id),
  -- Section 2.1: added to enable session→Provider mapping (mirrors customers.auth_provider_id)
  auth_provider_id  TEXT        UNIQUE,
  business_name     TEXT        NOT NULL,
  bio               TEXT,
  profile_image     TEXT,
  gallery           JSONB       NOT NULL DEFAULT '[]',
  faqs              JSONB       NOT NULL DEFAULT '[]',
  links             JSONB       NOT NULL DEFAULT '[]',
  onboarding_step   INTEGER     NOT NULL DEFAULT 0,
  is_published      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Section 5: indexes on providers
CREATE INDEX providers_provider_type_id_idx ON providers (provider_type_id);
CREATE INDEX providers_is_published_idx ON providers (is_published);
CREATE INDEX providers_auth_provider_id_idx ON providers (auth_provider_id);
-- Full-text search index (tsvector) on business_name and bio (Section 5)
CREATE INDEX providers_fts_idx ON providers
  USING GIN (to_tsvector('english', business_name || ' ' || COALESCE(bio, '')));

-- provider_field_values: composite PK on (provider_id, field_id) per Section 5
CREATE TABLE provider_field_values (
  provider_id  TEXT        NOT NULL REFERENCES providers (id) ON DELETE CASCADE,
  field_id     TEXT        NOT NULL REFERENCES fields (id),
  value        JSONB       NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider_id, field_id)
);

CREATE TABLE services (
  id               TEXT          PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  provider_id      TEXT          NOT NULL REFERENCES providers (id) ON DELETE CASCADE,
  image            TEXT,
  title            TEXT          NOT NULL,
  description      TEXT          NOT NULL,
  price            NUMERIC(10,2) NOT NULL,
  discount_type    discount_type NOT NULL DEFAULT 'none',
  discount_amount  NUMERIC(10,2),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX services_provider_id_idx ON services (provider_id);

CREATE TABLE tags (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name       TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- provider_tags: composite PK on (provider_id, tag_id) per Section 5
CREATE TABLE provider_tags (
  provider_id  TEXT NOT NULL REFERENCES providers (id) ON DELETE CASCADE,
  tag_id       TEXT NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
  PRIMARY KEY (provider_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- Customers (Section 3.1)
-- ---------------------------------------------------------------------------

CREATE TABLE customers (
  id                TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  email             TEXT        NOT NULL UNIQUE,
  name              TEXT        NOT NULL,
  phone             TEXT,
  -- nullable until first auth event; expected populated for all real accounts
  auth_provider_id  TEXT        UNIQUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Bookings (Section 3.2)
-- Two independent state machines: status (BookingStatus) and payment_status
-- (PaymentStatus). See Section 4.1 for why these are NOT merged into one enum.
-- SCHEMA-002: payout logic must check BOTH status='completed' AND
-- payment_status='captured'. Neither alone is sufficient (PAY-LOGIC-003/004).
-- ---------------------------------------------------------------------------

CREATE TABLE bookings (
  id                      TEXT            PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  provider_id             TEXT            NOT NULL REFERENCES providers (id),
  customer_id             TEXT            NOT NULL REFERENCES customers (id),
  service_id              TEXT            NOT NULL REFERENCES services (id),
  status                  booking_status  NOT NULL DEFAULT 'requested',
  -- Nullable until payment is initiated (Section 3.2)
  payment_status          payment_status,
  final_price             NUMERIC(10,2)   NOT NULL,
  commission_amount       NUMERIC(10,2)   NOT NULL,
  provider_payout_amount  NUMERIC(10,2)   NOT NULL,
  cancellation_reason     TEXT,
  requested_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Section 5: indexes on bookings
CREATE INDEX bookings_provider_id_idx ON bookings (provider_id);
CREATE INDEX bookings_customer_id_idx ON bookings (customer_id);
-- Composite index for auto-expiry cron sweep: WHERE status='requested' AND requested_at < threshold
CREATE INDEX bookings_status_requested_at_idx ON bookings (status, requested_at);

-- ---------------------------------------------------------------------------
-- Booking status history (Section 3.3, BOOK-LOGIC-004)
-- ---------------------------------------------------------------------------

CREATE TABLE booking_status_history (
  id           TEXT            PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  booking_id   TEXT            NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  -- Null for the initial creation event
  from_status  booking_status,
  to_status    booking_status  NOT NULL,
  actor_type   actor_type      NOT NULL,
  -- Null when actor_type = 'system'
  actor_id     TEXT,
  created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Reviews (Section 3.4)
-- ---------------------------------------------------------------------------

CREATE TABLE reviews (
  id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  -- Unique: one review per booking, enforcing PRD REV-004
  booking_id   TEXT        NOT NULL UNIQUE REFERENCES bookings (id),
  -- Denormalized from booking for query convenience (provider profile page)
  provider_id  TEXT        NOT NULL REFERENCES providers (id),
  -- Denormalized from booking for query convenience
  customer_id  TEXT        NOT NULL REFERENCES customers (id),
  rating       INTEGER     NOT NULL,
  comment      TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Section 5: indexes on reviews
CREATE INDEX reviews_provider_id_idx ON reviews (provider_id);
-- Unique index on booking_id enforces one review per booking (already implied by UNIQUE above,
-- but listed explicitly in Section 5 for clarity — the UNIQUE constraint creates it automatically)

-- ---------------------------------------------------------------------------
-- Content posts (Section 3.5, PRD Section 13 / FEED-001–FEED-004)
-- ---------------------------------------------------------------------------

CREATE TABLE content_posts (
  id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  provider_id  TEXT        NOT NULL REFERENCES providers (id) ON DELETE CASCADE,
  -- A post may be image and/or text (FEED-001)
  image_url    TEXT,
  body         TEXT,
  -- Feed ordering is reverse-chronological by created_at (FEED-002)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX content_posts_provider_id_created_at_idx ON content_posts (provider_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Tenant infrastructure (Section 3.6–3.7)
-- ---------------------------------------------------------------------------

CREATE TABLE tenant_domains (
  id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  -- The lookup key on every request — most critical index in the system (Section 5)
  domain       TEXT        NOT NULL UNIQUE,
  -- Null = unfiltered home marketplace (PRD TEN-005)
  category_id  TEXT        REFERENCES provider_categories (id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- unique index on domain (Section 5 — hottest lookup path)
-- Already enforced by the UNIQUE constraint above; the constraint creates the index automatically.

-- One-to-one extension of tenant_domains; kept separate to keep the hot-path table lean (Section 3.7)
CREATE TABLE tenant_branding (
  id                TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_domain_id  TEXT        NOT NULL UNIQUE REFERENCES tenant_domains (id) ON DELETE CASCADE,
  site_name         TEXT        NOT NULL,
  logo_url          TEXT,
  theme_color       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Platform config (Section 3.8, ARCH-007)
-- Key-value design: heterogeneous types, grows without migrations (Section 3.8)
-- ---------------------------------------------------------------------------

CREATE TABLE platform_config (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  key         TEXT        NOT NULL UNIQUE,
  value       JSONB       NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index on key (Section 5)
-- Already enforced by the UNIQUE constraint above.

-- ---------------------------------------------------------------------------
-- Paid placements (Section 3.9, RANK-LOGIC-003–006)
-- Time-bounded: a row only contributes to ranking when NOW() ∈ [active_from, active_until]
-- SCHEMA-001: reliability-penalty gate is an application-layer rule, not a DB constraint
-- ---------------------------------------------------------------------------

CREATE TABLE paid_placements (
  id            TEXT          PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  provider_id   TEXT          NOT NULL REFERENCES providers (id) ON DELETE CASCADE,
  -- Cap is read from platform_config, not hardcoded here (RANK-LOGIC-005)
  boost_factor  NUMERIC(4,2)  NOT NULL,
  active_from   TIMESTAMPTZ   NOT NULL,
  active_until  TIMESTAMPTZ   NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Section 5: composite index for ranking query (find active boost for a provider)
CREATE INDEX paid_placements_provider_active_idx
  ON paid_placements (provider_id, active_from, active_until);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- Postgres has no built-in auto-update for updated_at; we need a trigger function.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER providers_set_updated_at
  BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER provider_field_values_set_updated_at
  BEFORE UPDATE ON provider_field_values
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER services_set_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER customers_set_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER bookings_set_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER tenant_branding_set_updated_at
  BEFORE UPDATE ON tenant_branding
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER platform_config_set_updated_at
  BEFORE UPDATE ON platform_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
