-- =============================================================================
-- Pro membership: provider wallet + entitlement state
-- =============================================================================
--
-- Providers have no `customers` row (separate entity, separate auth_provider_id),
-- so the existing credit_wallet_* RPCs (keyed on customers.id) cannot be reused
-- for provider-side purchases. This migration adds a parallel provider wallet,
-- deliberately mirroring the customer wallet's shape rather than sharing its
-- table, so the customer payment path is untouched.
--
-- pro_memberships models the Pro entitlement itself. Entitlement *keys* (which
-- features Pro unlocks) live in application config (lib/entitlements.ts), not
-- here — this table only tracks whether a provider currently holds Pro.

-- ---------------------------------------------------------------------------
-- Provider credit wallet
-- ---------------------------------------------------------------------------
--
-- Mirrors the customer wallet convention (1 credit = R1), but providers are a
-- separate entity from customers and need their own balance row. Keep all
-- writes behind RPCs: providers can read their own balance/history, while the
-- service role is the only writer.

CREATE TABLE provider_credit_wallets (
  provider_id TEXT PRIMARY KEY REFERENCES providers (id) ON DELETE CASCADE,
  balance     NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER provider_credit_wallets_set_updated_at
  BEFORE UPDATE ON provider_credit_wallets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE provider_credit_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers read own credit wallet"
  ON provider_credit_wallets FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );

-- ---------------------------------------------------------------------------
-- Provider credit ledger — append-only transaction history
-- ---------------------------------------------------------------------------

CREATE TABLE provider_credit_transactions (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  provider_id     TEXT NOT NULL REFERENCES providers (id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('topup', 'debit', 'refund', 'adjustment')),
  amount          NUMERIC(12,2) NOT NULL CHECK (amount <> 0),
  balance_after   NUMERIC(12,2) NOT NULL,
  reference_type  TEXT NOT NULL CHECK (reference_type <> ''),
  reference_id    TEXT,
  yoco_ref        TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT provider_credit_transactions_amount_sign CHECK (
    (type IN ('topup', 'refund') AND amount > 0)
    OR (type = 'debit' AND amount < 0)
    OR (type = 'adjustment')
  ),
  CONSTRAINT provider_credit_transactions_adjustment_notes CHECK (
    type <> 'adjustment' OR NULLIF(BTRIM(COALESCE(notes, '')), '') IS NOT NULL
  )
);

CREATE INDEX provider_credit_transactions_provider_id_created_at_idx
  ON provider_credit_transactions (provider_id, created_at DESC);

CREATE UNIQUE INDEX provider_credit_transactions_yoco_ref_unique
  ON provider_credit_transactions (yoco_ref)
  WHERE yoco_ref IS NOT NULL;

ALTER TABLE provider_credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers read own credit transactions"
  ON provider_credit_transactions FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );

-- ---------------------------------------------------------------------------
-- RPC: topup_provider_wallet — idempotent on yoco_ref
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION topup_provider_wallet(
  p_provider_id TEXT,
  p_amount NUMERIC,
  p_yoco_ref TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC(12,2);
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Top-up amount must be positive';
  END IF;

  IF p_yoco_ref IS NULL OR NULLIF(BTRIM(p_yoco_ref), '') IS NULL THEN
    RAISE EXCEPTION 'Yoco reference is required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM provider_credit_transactions WHERE yoco_ref = p_yoco_ref
  ) THEN
    RETURN;
  END IF;

  INSERT INTO provider_credit_wallets (provider_id, balance)
  VALUES (p_provider_id, 0)
  ON CONFLICT (provider_id) DO NOTHING;

  UPDATE provider_credit_wallets
  SET balance = balance + p_amount
  WHERE provider_id = p_provider_id
  RETURNING balance INTO v_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Provider not found';
  END IF;

  INSERT INTO provider_credit_transactions (
    provider_id, type, amount, balance_after, reference_type, yoco_ref, notes
  ) VALUES (
    p_provider_id, 'topup', p_amount, v_balance, 'topup', p_yoco_ref,
    'Provider wallet top-up'
  );
END;
$$;

REVOKE ALL ON FUNCTION topup_provider_wallet(TEXT, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION topup_provider_wallet(TEXT, NUMERIC, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: spend_provider_wallet
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION spend_provider_wallet(
  p_provider_id TEXT,
  p_amount NUMERIC,
  p_reference_type TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_allow_negative BOOLEAN DEFAULT FALSE
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC(12,2);
  v_new_balance NUMERIC(12,2);
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Spend amount must be positive';
  END IF;

  IF p_reference_type IS NULL OR NULLIF(BTRIM(p_reference_type), '') IS NULL THEN
    RAISE EXCEPTION 'Reference type is required';
  END IF;

  INSERT INTO provider_credit_wallets (provider_id, balance)
  VALUES (p_provider_id, 0)
  ON CONFLICT (provider_id) DO NOTHING;

  SELECT balance INTO v_balance
  FROM provider_credit_wallets
  WHERE provider_id = p_provider_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Provider not found';
  END IF;

  IF NOT p_allow_negative AND v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient credit balance';
  END IF;

  v_new_balance := v_balance - p_amount;

  UPDATE provider_credit_wallets
  SET balance = v_new_balance
  WHERE provider_id = p_provider_id;

  INSERT INTO provider_credit_transactions (
    provider_id, type, amount, balance_after, reference_type, reference_id, notes
  ) VALUES (
    p_provider_id, 'debit', -p_amount, v_new_balance, p_reference_type,
    p_reference_id, p_description
  );
END;
$$;

REVOKE ALL ON FUNCTION spend_provider_wallet(TEXT, NUMERIC, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION spend_provider_wallet(TEXT, NUMERIC, TEXT, TEXT, TEXT, BOOLEAN) TO service_role;

-- ---------------------------------------------------------------------------
-- Pro membership state
-- ---------------------------------------------------------------------------
-- Entitlement keys (which features each source grants) live in application
-- config (lib/entitlements.ts) — this table only tracks membership status.

CREATE TYPE pro_membership_status AS ENUM ('active', 'lapsed', 'cancelled');
CREATE TYPE pro_membership_source AS ENUM ('purchased', 'package_included', 'granted');

CREATE TABLE pro_memberships (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  provider_id         TEXT NOT NULL REFERENCES providers (id),
  status              pro_membership_status NOT NULL DEFAULT 'active',
  source              pro_membership_source NOT NULL,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end  TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One active/lapsed membership per provider — cancelled rows are historical
-- and don't block a new membership from being created.
CREATE UNIQUE INDEX pro_memberships_provider_open_idx
  ON pro_memberships (provider_id)
  WHERE status IN ('active', 'lapsed');

CREATE INDEX pro_memberships_provider_id_idx ON pro_memberships (provider_id);

CREATE TRIGGER pro_memberships_set_updated_at
  BEFORE UPDATE ON pro_memberships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE pro_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers read own pro membership"
  ON pro_memberships FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );

-- ---------------------------------------------------------------------------
-- Pro membership pricing (credits; 1 credit = R1, debited from the provider
-- wallet, never a direct Yoco charge) lives in config/pro-membership.json,
-- not platform_config — see lib/entitlements.ts's PRO_MEMBERSHIP_CONFIG.
-- Deliberately not seeded into the DB here to avoid two sources of truth.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Drop verified_badge_paid — zero rows depend on it (confirmed via query
-- before this migration was written). Pro state now lives entirely in
-- pro_memberships; no Pro-related column carries a verified_ prefix, since
-- Pro is a paid membership, not a verification tier.
-- ---------------------------------------------------------------------------

DROP INDEX IF EXISTS providers_verified_badge_paid_idx;

ALTER TABLE providers
  DROP COLUMN IF EXISTS verified_badge_paid;

-- ---------------------------------------------------------------------------
-- pro.profile_customisation (Batch B) — accent colour, pinned service,
-- cover image, custom CTA. Gated entirely by hasEntitlement() in application code; these
-- columns hold values regardless of current entitlement so nothing is lost
-- if a membership lapses and is later reinstated. Display code is
-- responsible for ignoring them when the entitlement is absent.
-- ---------------------------------------------------------------------------

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS accent_color    TEXT,
  ADD COLUMN IF NOT EXISTS cover_image     TEXT,
  ADD COLUMN IF NOT EXISTS pinned_service_id TEXT REFERENCES services (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cta_label       TEXT,
  ADD COLUMN IF NOT EXISTS cta_target_url  TEXT;

-- ---------------------------------------------------------------------------
-- pro.custom_slug (Batch B) — slug history + redirect support.
-- Every slug a provider has ever held is recorded here (including the one
-- generated at onboarding) so changing to a vanity slug never breaks an
-- existing inbound link or indexed page — the profile route checks this
-- table and 301-redirects old slugs to the current one.
-- ---------------------------------------------------------------------------

CREATE TABLE provider_slug_history (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  provider_id  TEXT NOT NULL REFERENCES providers (id) ON DELETE CASCADE,
  slug         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A retired slug must never collide with another provider's *current* slug
-- (providers.slug is already UNIQUE) or with another retired slug.
CREATE UNIQUE INDEX provider_slug_history_slug_unique ON provider_slug_history (slug);
CREATE INDEX provider_slug_history_provider_id_idx ON provider_slug_history (provider_id);

-- ---------------------------------------------------------------------------
-- pro.publishing (Batch B) — Stories posts written via the provider-facing
-- Tiptap editor need the structured JSON alongside the plain-text `body`
-- (same article_json/article_text split used by services), so a provider can
-- re-open a published post for editing without losing formatting.
-- ---------------------------------------------------------------------------

ALTER TABLE content_posts
  ADD COLUMN IF NOT EXISTS body_json JSONB;

-- ---------------------------------------------------------------------------
-- Batch C, step 1 — remove paid_placements and its ranking boost.
-- Confirmed zero rows ever existed (content-range: */0 on an unfiltered
-- select) before this migration was written. The table let a provider pay to
-- reorder organic search results — a live "pay for rank" mechanism that
-- contradicted the platform rule that sponsored placement is bought time,
-- never bought rank. applyBoost() and its call sites in lib/domain/ranking.ts
-- and lib/search.ts were removed in the same change. Sponsored inventory
-- (sponsored_placements, below) renders in its own reserved, labelled slots
-- and never reorders the organic list.
-- ---------------------------------------------------------------------------

DROP INDEX IF EXISTS paid_placements_provider_active_idx;
DROP TABLE IF EXISTS paid_placements;
