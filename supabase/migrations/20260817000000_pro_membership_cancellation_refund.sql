-- =============================================================================
-- Pro membership cancellation refunds
-- =============================================================================
--
-- Purchased Pro can be cancelled within the refund window (see
-- config/pro-membership.json cancellation.refundWindowHours, currently 24
-- hours from started_at) for a full credit refund to the provider wallet,
-- with the membership cancelled immediately rather than staying active until
-- current_period_end. Cancelling outside the window keeps the existing
-- behaviour: no refund, entitlements remain until current_period_end.
--
-- provider_credit_transactions already has a 'refund' transaction type
-- (see 20260812000000_pro_membership.sql) with amount > 0 required — this
-- RPC is the first writer to use it.

CREATE OR REPLACE FUNCTION refund_provider_wallet(
  p_provider_id TEXT,
  p_amount NUMERIC,
  p_reference_type TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC(12,2);
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Refund amount must be positive';
  END IF;

  IF p_reference_type IS NULL OR NULLIF(BTRIM(p_reference_type), '') IS NULL THEN
    RAISE EXCEPTION 'Reference type is required';
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
    provider_id, type, amount, balance_after, reference_type, reference_id, notes
  ) VALUES (
    p_provider_id, 'refund', p_amount, v_balance, p_reference_type,
    p_reference_id, p_description
  );
END;
$$;

REVOKE ALL ON FUNCTION refund_provider_wallet(TEXT, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION refund_provider_wallet(TEXT, NUMERIC, TEXT, TEXT, TEXT) TO service_role;
