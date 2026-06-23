-- Customer dashboard support
-- Adds: saved_providers, notification_preferences on customers
-- Adds: is_disputed state via cancellation_reason convention (no new enum needed —
--       we use cancellation_reason = '__dispute__' as a soft flag so the booking
--       stays in 'cancelled' terminal state but the UI can surface a dispute banner).
-- Note: we do NOT add a new booking_status enum value here because altering
--       a production enum is a breaking migration. The dispute state is tracked
--       via cancellation_reason per the spec ("just give the customer a way to contact support").

-- ── saved_providers ──────────────────────────────────────────────────────────
-- One row per customer×provider pair. No expiry — customer manages their own list.

CREATE TABLE IF NOT EXISTS saved_providers (
  id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  customer_id  TEXT        NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  provider_id  TEXT        NOT NULL REFERENCES providers (id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, provider_id)
);

CREATE INDEX IF NOT EXISTS saved_providers_customer_id_idx ON saved_providers (customer_id);
CREATE INDEX IF NOT EXISTS saved_providers_provider_id_idx ON saved_providers (provider_id);

-- ── notification_preferences ─────────────────────────────────────────────────
-- One row per customer. Lazily created on first account settings save.
-- All flags default to true (opt-out model — best for a new platform).

CREATE TABLE IF NOT EXISTS notification_preferences (
  id                    TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  customer_id           TEXT        NOT NULL UNIQUE REFERENCES customers (id) ON DELETE CASCADE,
  booking_updates_email BOOLEAN     NOT NULL DEFAULT TRUE,
  messages_email        BOOLEAN     NOT NULL DEFAULT TRUE,
  promotional_email     BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER notification_preferences_set_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── customers extra columns ───────────────────────────────────────────────────
-- phone already exists in schema; nothing new needed there.
-- Add display_name alias just in case UI wants a separate display name (no-op if name is sufficient).
-- (Skipping — name column already on customers table per init.sql)
