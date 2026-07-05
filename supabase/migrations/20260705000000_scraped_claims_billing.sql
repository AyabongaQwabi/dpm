-- Scraped/claimable providers, profile claims, and base subscription billing.

-- Migration A: provider profile additions for scraped listings
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS claim_status TEXT NOT NULL DEFAULT 'claimed'
    CHECK (claim_status IN ('unclaimed', 'claim_pending', 'claimed')),
  ADD COLUMN IF NOT EXISTS is_scraped BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS providers_claim_status_idx ON providers (claim_status);

-- Migration B: profile claims
CREATE TABLE IF NOT EXISTS profile_claims (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  provider_id       TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  claimant_email    TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  code_expires_at   TIMESTAMPTZ NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'expired', 'rejected')),
  claimed_auth_id   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at       TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS profile_claims_active_one
  ON profile_claims (provider_id)
  WHERE status = 'pending';

ALTER TABLE profile_claims ENABLE ROW LEVEL SECURITY;

-- Migration C: base R99 subscription billing cycle
CREATE TABLE IF NOT EXISTS provider_subscriptions (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  provider_id         TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  package_number      INTEGER NOT NULL DEFAULT 1
    CHECK (package_number BETWEEN 1 AND 5),
  monthly_fee         NUMERIC(10,2) NOT NULL DEFAULT 99.00,
  billing_start       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  billing_end         TIMESTAMPTZ NOT NULL,
  status              TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'cancelled')),
  last_reminder_sent_at TIMESTAMPTZ,
  last_renewal_paystack_ref TEXT UNIQUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_subscriptions_active_one
  ON provider_subscriptions (provider_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS provider_subscriptions_billing_end_idx
  ON provider_subscriptions (billing_end)
  WHERE status = 'active';

ALTER TABLE provider_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers see own subscriptions"
  ON provider_subscriptions FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );
