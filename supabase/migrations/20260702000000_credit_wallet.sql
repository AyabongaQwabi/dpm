-- =============================================================================
-- Credit wallet migration
-- Convention: 1 credit = R1. Whole-number credits only — round at spend time.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Customer wallet balance
-- ---------------------------------------------------------------------------

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS credit_balance INTEGER NOT NULL DEFAULT 0
    CHECK (credit_balance >= 0);

-- ---------------------------------------------------------------------------
-- Booking schema reconciliation (checkout drift)
-- ---------------------------------------------------------------------------

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS package_id TEXT REFERENCES service_packages (id);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ---------------------------------------------------------------------------
-- Credit ledger
-- ---------------------------------------------------------------------------

CREATE TYPE credit_transaction_type AS ENUM ('purchase', 'spend', 'refund');

CREATE TABLE credit_transactions (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  customer_id   TEXT NOT NULL REFERENCES customers (id),
  type          credit_transaction_type NOT NULL,
  amount        INTEGER NOT NULL CHECK (amount <> 0),
  description   TEXT NOT NULL,
  booking_id    TEXT REFERENCES bookings (id),
  paystack_ref  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX credit_transactions_customer_id_created_at_idx
  ON credit_transactions (customer_id, created_at DESC);

CREATE UNIQUE INDEX credit_transactions_paystack_ref_unique
  ON credit_transactions (paystack_ref)
  WHERE paystack_ref IS NOT NULL;

CREATE UNIQUE INDEX credit_transactions_refund_per_booking
  ON credit_transactions (booking_id)
  WHERE type = 'refund' AND booking_id IS NOT NULL;

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers read own credit transactions"
  ON credit_transactions FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );

-- ---------------------------------------------------------------------------
-- Provider payout queue (manual batch payouts — no Paystack transfer API)
-- ---------------------------------------------------------------------------

CREATE TYPE provider_payout_status AS ENUM ('pending', 'processing', 'paid');

CREATE TABLE provider_payouts (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  booking_id          TEXT NOT NULL UNIQUE REFERENCES bookings (id),
  provider_id         TEXT NOT NULL REFERENCES providers (id),
  gross_amount        INTEGER NOT NULL,
  commission_amount   INTEGER NOT NULL,
  net_payout_amount   INTEGER NOT NULL,
  status              provider_payout_status NOT NULL DEFAULT 'pending',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX provider_payouts_provider_id_status_idx
  ON provider_payouts (provider_id, status);

CREATE TRIGGER provider_payouts_set_updated_at
  BEFORE UPDATE ON provider_payouts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE provider_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers read own payouts"
  ON provider_payouts FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );

-- ---------------------------------------------------------------------------
-- platform_config seeds — credit purchase + support
-- ---------------------------------------------------------------------------

INSERT INTO platform_config (key, value, description) VALUES
  ('credit_pack_denominations', '[100,250,500,1000]',
   'Fixed credit purchase packs (credits = Rands)'),
  ('credit_purchase_min', '50',
   'Minimum custom credit purchase (Rands/credits)'),
  ('credit_purchase_max', '5000',
   'Maximum single credit purchase (Rands/credits)'),
  ('provider_payout_business_days', '5',
   'Business days shown in provider payout pending copy'),
  ('support_email', '"support@servicepros.co.za"',
   'Support contact for policy pages and disputes')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- RPC: credit_wallet_purchase — idempotent on paystack_ref
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION credit_wallet_purchase(
  p_customer_id TEXT,
  p_amount INTEGER,
  p_paystack_ref TEXT,
  p_description TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Purchase amount must be positive';
  END IF;

  IF p_paystack_ref IS NOT NULL AND EXISTS (
    SELECT 1 FROM credit_transactions WHERE paystack_ref = p_paystack_ref
  ) THEN
    RETURN;
  END IF;

  UPDATE customers
  SET credit_balance = credit_balance + p_amount,
      updated_at = NOW()
  WHERE id = p_customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  INSERT INTO credit_transactions (customer_id, type, amount, description, paystack_ref)
  VALUES (p_customer_id, 'purchase', p_amount, p_description, p_paystack_ref);
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: credit_wallet_spend
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION credit_wallet_spend(
  p_customer_id TEXT,
  p_amount INTEGER,
  p_booking_id TEXT,
  p_description TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Spend amount must be positive';
  END IF;

  SELECT credit_balance INTO v_balance
  FROM customers
  WHERE id = p_customer_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient credit balance';
  END IF;

  UPDATE customers
  SET credit_balance = credit_balance - p_amount,
      updated_at = NOW()
  WHERE id = p_customer_id;

  INSERT INTO credit_transactions (customer_id, type, amount, description, booking_id)
  VALUES (p_customer_id, 'spend', -p_amount, p_description, p_booking_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: credit_wallet_refund — idempotent per booking
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION credit_wallet_refund(
  p_customer_id TEXT,
  p_amount INTEGER,
  p_booking_id TEXT,
  p_description TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Refund amount must be positive';
  END IF;

  IF EXISTS (
    SELECT 1 FROM credit_transactions
    WHERE booking_id = p_booking_id AND type = 'refund'
  ) THEN
    RETURN;
  END IF;

  UPDATE customers
  SET credit_balance = credit_balance + p_amount,
      updated_at = NOW()
  WHERE id = p_customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  INSERT INTO credit_transactions (customer_id, type, amount, description, booking_id)
  VALUES (p_customer_id, 'refund', p_amount, p_description, p_booking_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: create_booking_with_credit_spend — atomic booking + wallet deduction
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_booking_with_credit_spend(
  p_customer_id TEXT,
  p_provider_id TEXT,
  p_service_id TEXT,
  p_package_id TEXT,
  p_notes TEXT,
  p_final_price NUMERIC,
  p_commission_amount NUMERIC,
  p_provider_payout_amount NUMERIC,
  p_spend_credits INTEGER,
  p_description TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
  v_booking_id TEXT;
BEGIN
  IF p_spend_credits <= 0 THEN
    RAISE EXCEPTION 'Spend amount must be positive';
  END IF;

  SELECT credit_balance INTO v_balance
  FROM customers
  WHERE id = p_customer_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  IF v_balance < p_spend_credits THEN
    RAISE EXCEPTION 'Insufficient credit balance';
  END IF;

  UPDATE customers
  SET credit_balance = credit_balance - p_spend_credits,
      updated_at = NOW()
  WHERE id = p_customer_id;

  INSERT INTO bookings (
    provider_id, customer_id, service_id, package_id, notes,
    status, payment_status, final_price, commission_amount, provider_payout_amount
  ) VALUES (
    p_provider_id, p_customer_id, p_service_id, p_package_id, p_notes,
    'requested', 'captured', p_final_price, p_commission_amount, p_provider_payout_amount
  )
  RETURNING id INTO v_booking_id;

  INSERT INTO credit_transactions (customer_id, type, amount, description, booking_id)
  VALUES (p_customer_id, 'spend', -p_spend_credits, p_description, v_booking_id);

  RETURN v_booking_id;
END;
$$;
