-- create_booking_with_credit_spend: populate bookings.source / origin_domain
-- (added nullable/defaulted in 20260820000000_funnel_events.sql, never
-- written by this RPC until now). New params are defaulted so this remains
-- backward compatible with any caller that hasn't been updated to pass them.

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
  p_description TEXT,
  p_source TEXT DEFAULT 'site',
  p_origin_domain TEXT DEFAULT NULL
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
    status, payment_status, final_price, commission_amount, provider_payout_amount,
    source, origin_domain
  ) VALUES (
    p_provider_id, p_customer_id, p_service_id, p_package_id, p_notes,
    'requested', 'captured', p_final_price, p_commission_amount, p_provider_payout_amount,
    COALESCE(p_source, 'site'), p_origin_domain
  )
  RETURNING id INTO v_booking_id;

  INSERT INTO credit_transactions (customer_id, type, amount, description, booking_id)
  VALUES (p_customer_id, 'spend', -p_spend_credits, p_description, v_booking_id);

  RETURN v_booking_id;
END;
$$;
