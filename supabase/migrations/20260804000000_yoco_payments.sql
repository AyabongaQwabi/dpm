-- Switch payment gateway references from Paystack to Yoco.
-- Column/param renames only — ledger data and semantics unchanged.

ALTER TABLE credit_transactions RENAME COLUMN paystack_ref TO yoco_ref;
ALTER INDEX credit_transactions_paystack_ref_unique RENAME TO credit_transactions_yoco_ref_unique;

ALTER TABLE provider_subscriptions RENAME COLUMN last_renewal_paystack_ref TO last_renewal_yoco_ref;

-- CREATE OR REPLACE can't rename a parameter (p_paystack_ref -> p_yoco_ref);
-- drop and recreate instead.
DROP FUNCTION IF EXISTS credit_wallet_purchase(TEXT, INTEGER, TEXT, TEXT, INTEGER, TEXT);

CREATE FUNCTION credit_wallet_purchase(
  p_customer_id TEXT,
  p_amount INTEGER,
  p_yoco_ref TEXT,
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

  IF p_yoco_ref IS NOT NULL AND EXISTS (
    SELECT 1 FROM credit_transactions WHERE yoco_ref = p_yoco_ref
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
    customer_id, type, amount, bonus_credits, promotion_id, description, yoco_ref
  )
  VALUES (
    p_customer_id, 'purchase', p_amount, p_bonus_credits, p_promotion_id, p_description, p_yoco_ref
  );
END;
$$;
