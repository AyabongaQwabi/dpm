-- Pricing model schema
-- Source: docs/docs/dpm_pricing_model_source_of_truth.docx
-- Adds: ceiling subscriptions, sale price history, price review holds,
--       discount bonus opt-ins, and platform_config rows for all new keys.
--
-- NOTE: All FK columns referencing existing tables use TEXT to match the
-- project-wide convention: every PK in this schema is TEXT (gen_random_uuid()::TEXT).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. provider_ceiling_subscriptions
--    One active subscription per provider at a time.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS provider_ceiling_subscriptions (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  provider_id   TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  ceiling_rate  numeric(6,4) NOT NULL,   -- e.g. 0.1000, 0.0950, 0.0850, 0.0750
  monthly_fee   numeric(10,2) NOT NULL,  -- e.g. 499.00
  active_from   timestamptz NOT NULL DEFAULT now(),
  active_to     timestamptz,             -- null = currently active
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Only one active (active_to IS NULL) subscription per provider
CREATE UNIQUE INDEX IF NOT EXISTS provider_ceiling_subscriptions_active_one
  ON provider_ceiling_subscriptions (provider_id)
  WHERE active_to IS NULL;

ALTER TABLE provider_ceiling_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers see own ceiling subscriptions"
  ON provider_ceiling_subscriptions FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. service_sale_prices
--    Records the final (post-discount) price at which each booking was
--    completed. Used by the anti-gaming checks (PRICE-LOGIC-001/002) to
--    determine whether a genuine prior sale occurred within the qualifying band.
--    Must reference bookings table — never price edit history.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_sale_prices (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  service_id  TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  package_id  TEXT NOT NULL REFERENCES service_packages(id) ON DELETE CASCADE,
  booking_id  TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sale_price  numeric(10,2) NOT NULL,  -- final price customer paid (post-discount)
  sold_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_sale_prices_service_id_idx
  ON service_sale_prices (service_id, sold_at DESC);

CREATE INDEX IF NOT EXISTS service_sale_prices_booking_id_idx
  ON service_sale_prices (booking_id);

ALTER TABLE service_sale_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers see own service sale prices"
  ON service_sale_prices FOR SELECT
  USING (
    service_id IN (
      SELECT s.id FROM services s
      JOIN providers p ON p.id = s.provider_id
      WHERE p.auth_provider_id = auth.uid()::TEXT
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. service_price_review_holds
--    When a provider raises a service package price by ≥50% (PRICE-LOGIC-006),
--    the new price is NOT applied to the live listing. Instead a review hold
--    is created. The old price stays live for customers until the hold is
--    resolved. Resolution workflow (who reviews, approve/reject) is out of
--    scope per the source doc — only the held state is implemented here.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_price_review_holds (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  service_id      TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  package_id      TEXT NOT NULL REFERENCES service_packages(id) ON DELETE CASCADE,
  old_price       numeric(10,2) NOT NULL,   -- price that remains live
  proposed_price  numeric(10,2) NOT NULL,   -- price awaiting review
  increase_pct    numeric(6,2) NOT NULL,    -- calculated at hold creation
  -- status: pending_review | approved | rejected
  status          text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz
);

-- Only one active hold per package at a time
CREATE UNIQUE INDEX IF NOT EXISTS service_price_review_holds_active_one
  ON service_price_review_holds (package_id)
  WHERE status = 'pending_review';

ALTER TABLE service_price_review_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers see own price review holds"
  ON service_price_review_holds FOR SELECT
  USING (
    service_id IN (
      SELECT s.id FROM services s
      JOIN providers p ON p.id = s.provider_id
      WHERE p.auth_provider_id = auth.uid()::TEXT
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. service_discount_bonus_opts
--    Tracks whether a provider has opted into the discount-unlock bonus for a
--    specific service. Opt-in must be explicit — bonus is never applied silently
--    (Section 5.6 of source doc). One record per service per ceiling tier;
--    if the provider changes ceiling tier, a new opt-in is required.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_discount_bonus_opts (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  service_id   TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  provider_id  TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  ceiling_rate numeric(6,4) NOT NULL,   -- ceiling tier at time of opt-in
  bonus_rate   numeric(6,4) NOT NULL,   -- bonus deducted from ceiling_rate
  opted_in_at  timestamptz NOT NULL DEFAULT now(),
  opted_out_at timestamptz              -- null = still active
);

CREATE UNIQUE INDEX IF NOT EXISTS service_discount_bonus_opts_active_one
  ON service_discount_bonus_opts (service_id)
  WHERE opted_out_at IS NULL;

ALTER TABLE service_discount_bonus_opts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers manage own discount bonus opts"
  ON service_discount_bonus_opts FOR ALL
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. platform_config — insert all new pricing keys
--    All rates/boundaries/fees are stored here so they can be updated without
--    a code deploy. The InMemoryConfigStore in tests mirrors these values.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO platform_config (key, value, description) VALUES
  -- Commission brackets (Section 2)
  ('commission_rate_bracket_1', '0.075',  'Commission rate for sales R0–R999 (7.5%)'),
  ('commission_rate_bracket_2', '0.085',  'Commission rate for sales R1000–R4999 (8.5%)'),
  ('commission_rate_bracket_3', '0.095',  'Commission rate for sales R5000–R9999 (9.5%)'),
  ('commission_rate_bracket_4', '0.10',   'Commission rate for sales R10000–R49999 (10%)'),
  ('commission_rate_bracket_5', '0.1275', 'Commission rate for sales R50000+ (12.75%)'),
  ('commission_bracket_1_max',  '999',    'Upper boundary (inclusive) of commission bracket 1'),
  ('commission_bracket_2_max',  '4999',   'Upper boundary (inclusive) of commission bracket 2'),
  ('commission_bracket_3_max',  '9999',   'Upper boundary (inclusive) of commission bracket 3'),
  ('commission_bracket_4_max',  '49999',  'Upper boundary (inclusive) of commission bracket 4'),

  -- Provider subscription (Section 1)
  ('provider_subscription_fee', '99', 'Monthly platform subscription fee (ZAR) — applies to all providers'),

  -- Ceiling package rates (Section 3)
  ('ceiling_rate_10',  '0.10',  'Ceiling rate for the R499/mo package (10%)'),
  ('ceiling_rate_95',  '0.095', 'Ceiling rate for the R799/mo package (9.5%)'),
  ('ceiling_rate_85',  '0.085', 'Ceiling rate for the R1199/mo package (8.5%)'),
  ('ceiling_rate_75',  '0.075', 'Ceiling rate for the R1699/mo package (7.5%)'),

  -- Ceiling package monthly fees (Section 3)
  ('ceiling_fee_10',  '499',  'Monthly fee for the 10% ceiling package (ZAR)'),
  ('ceiling_fee_95',  '799',  'Monthly fee for the 9.5% ceiling package (ZAR)'),
  ('ceiling_fee_85',  '1199', 'Monthly fee for the 8.5% ceiling package (ZAR)'),
  ('ceiling_fee_75',  '1699', 'Monthly fee for the 7.5% ceiling package (ZAR)'),

  -- Discount-unlock bonus points (Section 4)
  -- These are subtracted from the ceiling rate when all bonus conditions are met
  ('discount_bonus_10', '0.025', 'Bonus rate reduction for 10% ceiling package (−2.5 pts)'),
  ('discount_bonus_95', '0.030', 'Bonus rate reduction for 9.5% ceiling package (−3.0 pts)'),
  ('discount_bonus_85', '0.035', 'Bonus rate reduction for 8.5% ceiling package (−3.5 pts)'),
  ('discount_bonus_75', '0.045', 'Bonus rate reduction for 7.5% ceiling package (−4.5 pts)'),

  -- Price-change moderation band boundaries (Section 5)
  ('price_change_band_1_max_pct',        '5.0',  'Max % increase to stay in band 1 (eligible, not flagged)'),
  ('price_change_band_2_max_pct',        '9.5',  'Exclusive lower boundary of band 3 (9.4999% = still band 2)'),
  ('price_change_band_3_max_pct',        '25.0', 'Exclusive lower boundary of band 4 (24.9999% = still band 3)'),
  ('price_change_band_4_max_pct',        '50.0', 'Exclusive lower boundary of band 5 (49.9999% = still band 4)'),
  ('price_change_high_demand_threshold', '3',    'Min completed sales in qualifying band to exempt band-3 flag')
ON CONFLICT (key) DO NOTHING;
