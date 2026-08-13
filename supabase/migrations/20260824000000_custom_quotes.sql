-- =============================================================================
-- Custom quote v1.
--
-- Quote requests are text-only in v1. Pre-booking files deliberately stay out
-- of scope because the existing file primitive is booking-scoped by design.
-- Once a quote is accepted and a normal booking exists, booking_files continues
-- to handle the job's file exchange.
-- =============================================================================

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS accepts_custom_quotes BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  CREATE TYPE quote_request_status AS ENUM (
    'requested',
    'quoted',
    'accepted',
    'declined',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE quote_status AS ENUM (
    'sent',
    'accepted',
    'declined',
    'expired',
    'superseded'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS services_id_provider_id_unique_idx
  ON services(id, provider_id);

CREATE TABLE IF NOT EXISTS quote_requests (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  service_id  TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  decline_reason TEXT,
  status      quote_request_status NOT NULL DEFAULT 'requested',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (char_length(trim(description)) > 0)
);

DO $$
BEGIN
  ALTER TABLE quote_requests
    ADD CONSTRAINT quote_requests_service_provider_fkey
    FOREIGN KEY (service_id, provider_id) REFERENCES services(id, provider_id)
    ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS quote_requests_id_provider_id_unique_idx
  ON quote_requests(id, provider_id);

CREATE INDEX IF NOT EXISTS quote_requests_customer_id_created_at_idx
  ON quote_requests(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quote_requests_provider_id_created_at_idx
  ON quote_requests(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quote_requests_service_id_idx
  ON quote_requests(service_id);

DROP TRIGGER IF EXISTS quote_requests_set_updated_at ON quote_requests;
CREATE TRIGGER quote_requests_set_updated_at
  BEFORE UPDATE ON quote_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers read own quote requests" ON quote_requests;
CREATE POLICY "customers read own quote requests"
  ON quote_requests FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );

DROP POLICY IF EXISTS "providers read own quote requests" ON quote_requests;
CREATE POLICY "providers read own quote requests"
  ON quote_requests FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );

DROP POLICY IF EXISTS "customers create own quote requests" ON quote_requests;
CREATE POLICY "customers create own quote requests"
  ON quote_requests FOR INSERT
  WITH CHECK (
    customer_id IN (
      SELECT id FROM customers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );

CREATE TABLE IF NOT EXISTS quotes (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  quote_request_id TEXT NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  provider_id      TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  line_items       JSONB NOT NULL DEFAULT '[]',
  total_amount     INTEGER NOT NULL CHECK (total_amount > 0),
  validity_date    DATE NOT NULL,
  terms_text       TEXT NOT NULL DEFAULT '',
  decline_reason   TEXT,
  status           quote_status NOT NULL DEFAULT 'sent',
  booking_id       TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (jsonb_typeof(line_items) = 'array'),
  CHECK (char_length(trim(terms_text)) >= 0)
);

DO $$
BEGIN
  ALTER TABLE quotes
    ADD CONSTRAINT quotes_request_provider_fkey
    FOREIGN KEY (quote_request_id, provider_id) REFERENCES quote_requests(id, provider_id)
    ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS quotes_quote_request_id_created_at_idx
  ON quotes(quote_request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quotes_provider_id_created_at_idx
  ON quotes(provider_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS quotes_one_active_per_request_idx
  ON quotes(quote_request_id)
  WHERE status = 'sent';

DROP TRIGGER IF EXISTS quotes_set_updated_at ON quotes;
CREATE TRIGGER quotes_set_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS quote_request_id TEXT REFERENCES quote_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quote_id TEXT REFERENCES quotes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS bookings_quote_request_id_idx
  ON bookings(quote_request_id)
  WHERE quote_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS bookings_quote_id_idx
  ON bookings(quote_id)
  WHERE quote_id IS NOT NULL;

DROP POLICY IF EXISTS "customers read own quotes" ON quotes;
CREATE POLICY "customers read own quotes"
  ON quotes FOR SELECT
  USING (
    quote_request_id IN (
      SELECT qr.id FROM quote_requests qr
      JOIN customers c ON c.id = qr.customer_id
      WHERE c.auth_provider_id = auth.uid()::TEXT
    )
  );

DROP POLICY IF EXISTS "providers read own quotes" ON quotes;
CREATE POLICY "providers read own quotes"
  ON quotes FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );

DROP POLICY IF EXISTS "providers create own quotes" ON quotes;
CREATE POLICY "providers create own quotes"
  ON quotes FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );

DROP POLICY IF EXISTS "providers update own sent quotes" ON quotes;
CREATE POLICY "providers update own sent quotes"
  ON quotes FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
    )
    AND status IN ('sent', 'superseded')
  )
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );
