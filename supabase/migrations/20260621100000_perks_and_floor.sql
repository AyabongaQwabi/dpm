-- Package perks: stacking floor and temporary commission-reduction add-ons
-- Source: docs/docs/dpm_package_perks_matrix.docx
--
-- This migration adds:
--   1. provider_temp_reductions — time-bounded grant records (one active per provider)
--   2. platform_config rows for stacking floor and per-package reduction amounts/durations
--
-- NOT included (out of scope per the perks matrix, Sections 2.1, 3, 4):
--   - Purchasable standalone add-ons (price/duration menu not yet finalised)
--   - Partner coupon records (partner admin system not yet built)
--   - Business Rescue / Business Management Support (scope undefined)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. provider_temp_reductions
--    Tracks time-bounded commission-reduction grants per provider.
--    One active grant per provider at a time (partial unique index).
--
--    A grant is "active" while active_until > now() AND cancelled_at IS NULL.
--    Expiry is checked at query time — no background cleanup job needed.
--
--    grant_reason distinguishes the two ways a grant can originate:
--      'retention_rescue' — granted by the platform as a retention/rescue perk
--                           (trigger mechanism is in the lifecycle addendum,
--                           not yet specified — this table is the underlying
--                           record so it can be wired up to any future trigger)
--      'purchase'         — purchased directly by the provider
--                           (purchasable add-on menu not yet finalised per
--                           perks matrix Section 2.1 — do not expose purchase
--                           UI until confirmed)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS provider_temp_reductions (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  provider_id     TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  -- package_number 1–5 matches the perks matrix package numbering
  package_number  smallint NOT NULL CHECK (package_number BETWEEN 1 AND 5),
  -- reduction_points: rate points subtracted from effective rate (e.g. 0.035 = −3.5pt)
  reduction_points numeric(6,4) NOT NULL,
  active_from     timestamptz NOT NULL DEFAULT now(),
  active_until    timestamptz NOT NULL,
  -- how this grant originated — kept as a string to allow future values
  grant_reason    text NOT NULL CHECK (grant_reason IN ('retention_rescue', 'purchase')),
  -- soft-cancel: allows early termination before active_until
  cancelled_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- One non-cancelled grant per provider at a time.
-- Postgres does not allow STABLE/VOLATILE functions (e.g. now()) in partial
-- index predicates, so we can only filter on cancelled_at IS NULL here.
-- The expiry check (active_until > now()) is enforced at the application layer
-- before inserting a new grant.
CREATE UNIQUE INDEX IF NOT EXISTS provider_temp_reductions_one_active
  ON provider_temp_reductions (provider_id)
  WHERE cancelled_at IS NULL;

CREATE INDEX IF NOT EXISTS provider_temp_reductions_provider_id_idx
  ON provider_temp_reductions (provider_id, active_until DESC);

ALTER TABLE provider_temp_reductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers see own temp reductions"
  ON provider_temp_reductions FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. platform_config — stacking floor and temporary reduction values
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO platform_config (key, value, description) VALUES
  -- Stacking floor (perks matrix, Section 1)
  -- Confirmed: 4% (0.04). Protects DPM margin above payment-processing costs.
  -- Do not set below 3% without finance sign-off.
  ('commission_stacking_floor', '0.04',
   'Hard floor: effective commission rate never falls below this after all discount layers. Confirmed at 4%.'),

  -- Temporary reduction amounts per package (perks matrix, Section 2)
  ('temp_reduction_pkg_1', '0.010',
   'Temporary commission reduction for Package 1 (base R99): −1.0 percentage points'),
  ('temp_reduction_pkg_2', '0.016',
   'Temporary commission reduction for Package 2 (10% ceiling, R499/mo): −1.6 percentage points'),
  ('temp_reduction_pkg_3', '0.020',
   'Temporary commission reduction for Package 3 (9.5% ceiling, R799/mo): −2.0 percentage points'),
  ('temp_reduction_pkg_4', '0.030',
   'Temporary commission reduction for Package 4 (8.5% ceiling, R1199/mo): −3.0 percentage points'),
  ('temp_reduction_pkg_5', '0.035',
   'Temporary commission reduction for Package 5 (7.5% ceiling, R1699/mo): −3.5 percentage points'),

  -- Temporary reduction durations per package (in calendar months)
  ('temp_reduction_pkg_1_months', '3',
   'Duration of temporary reduction grant for Package 1: 3 months'),
  ('temp_reduction_pkg_2_months', '3',
   'Duration of temporary reduction grant for Package 2: 3 months'),
  ('temp_reduction_pkg_3_months', '3',
   'Duration of temporary reduction grant for Package 3: 3 months'),
  ('temp_reduction_pkg_4_months', '3',
   'Duration of temporary reduction grant for Package 4: 3 months'),
  ('temp_reduction_pkg_5_months', '6',
   'Duration of temporary reduction grant for Package 5: 6 months')

ON CONFLICT (key) DO NOTHING;
