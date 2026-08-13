-- =============================================================================
-- Provider finance: payout destinations and requested payout batches.
--
-- provider_payouts remains the per-booking ledger created on completion.
-- provider_payout_requests is the provider-initiated batch request an admin
-- processes manually.
-- =============================================================================

CREATE TABLE IF NOT EXISTS provider_payout_methods (
  provider_id       TEXT PRIMARY KEY REFERENCES providers(id) ON DELETE CASCADE,
  method            TEXT NOT NULL CHECK (method IN ('bank', 'payshap')),
  name_on_account   TEXT NOT NULL,
  bank_name         TEXT NOT NULL,
  account_type      TEXT,
  account_number    TEXT,
  branch_code       TEXT,
  payshap_cellphone TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT provider_payout_methods_bank_fields CHECK (
    method <> 'bank'
    OR (
      account_type IS NOT NULL
      AND account_number IS NOT NULL
      AND branch_code IS NOT NULL
    )
  ),
  CONSTRAINT provider_payout_methods_payshap_fields CHECK (
    method <> 'payshap'
    OR payshap_cellphone IS NOT NULL
  )
);

DROP TRIGGER IF EXISTS provider_payout_methods_set_updated_at ON provider_payout_methods;
CREATE TRIGGER provider_payout_methods_set_updated_at
  BEFORE UPDATE ON provider_payout_methods
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE provider_payout_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "providers manage own payout method" ON provider_payout_methods;
CREATE POLICY "providers manage own payout method"
  ON provider_payout_methods FOR ALL
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

CREATE TABLE IF NOT EXISTS provider_payout_requests (
  id                         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  provider_id                TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  amount                     INTEGER NOT NULL CHECK (amount > 0),
  status                     TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'paid', 'cancelled')),
  method                     TEXT NOT NULL CHECK (method IN ('bank', 'payshap')),
  name_on_account            TEXT NOT NULL,
  bank_name                  TEXT NOT NULL,
  account_type               TEXT,
  account_number             TEXT,
  branch_code                TEXT,
  payshap_cellphone          TEXT,
  provider_note              TEXT,
  admin_note                 TEXT,
  requested_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at                    TIMESTAMPTZ,
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS provider_payout_requests_provider_status_idx
  ON provider_payout_requests (provider_id, status, requested_at DESC);

DROP TRIGGER IF EXISTS provider_payout_requests_set_updated_at ON provider_payout_requests;
CREATE TRIGGER provider_payout_requests_set_updated_at
  BEFORE UPDATE ON provider_payout_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE provider_payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "providers read own payout requests" ON provider_payout_requests;
CREATE POLICY "providers read own payout requests"
  ON provider_payout_requests FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );

-- Inserts are handled by trusted server actions so available-balance and
-- config/platform-config.json's providerPayout.minimumRequestAmount checks
-- cannot be bypassed from the browser.
