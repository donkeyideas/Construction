-- ============================================================
-- Atomic bank balance adjustment RPC
-- Prevents race conditions from concurrent SELECT+UPDATE
-- ============================================================

CREATE OR REPLACE FUNCTION public.adjust_bank_balance(
  p_bank_id UUID,
  p_adjustment NUMERIC
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE bank_accounts
  SET current_balance = current_balance + p_adjustment,
      updated_at = NOW()
  WHERE id = p_bank_id;
END;
$$;
