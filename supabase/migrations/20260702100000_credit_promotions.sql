-- =============================================================================
-- Credit promotions — bonus credits on purchase with ledger audit trail
-- =============================================================================

ALTER TABLE credit_transactions
  ADD COLUMN IF NOT EXISTS promotion_id TEXT,
  ADD COLUMN IF NOT EXISTS bonus_credits INTEGER;

CREATE OR REPLACE FUNCTION credit_wallet_purchase(
  p_customer_id TEXT,
  p_amount INTEGER,
  p_paystack_ref TEXT,
  p_description TEXT,
  p_bonus_credits INTEGER DEFAULT 0,
  p_promotion_id TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Purchase amount must be positive';
  END IF;

  IF p_bonus_credits IS NOT NULL AND p_bonus_credits < 0 THEN
    RAISE EXCEPTION 'Bonus credits cannot be negative';
  END IF;

  IF p_paystack_ref IS NOT NULL AND EXISTS (
    SELECT 1 FROM credit_transactions WHERE paystack_ref = p_paystack_ref
  ) THEN
    RETURN;
  END IF;

  v_total := p_amount + COALESCE(p_bonus_credits, 0);

  UPDATE customers
  SET credit_balance = credit_balance + v_total,
      updated_at = NOW()
  WHERE id = p_customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  INSERT INTO credit_transactions (
    customer_id, type, amount, bonus_credits, promotion_id, description, paystack_ref
  )
  VALUES (
    p_customer_id, 'purchase', p_amount, p_bonus_credits, p_promotion_id, p_description, p_paystack_ref
  );
END;
$$;
