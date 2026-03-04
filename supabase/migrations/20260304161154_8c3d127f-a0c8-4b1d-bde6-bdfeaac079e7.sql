-- Atomic balance add: prevents race conditions in top-up approvals
CREATE OR REPLACE FUNCTION public.atomic_balance_add(p_user_id uuid, p_amount bigint)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET balance = balance + p_amount
  WHERE user_id = p_user_id;
$$;

-- Atomic refund: prevents race conditions in API failure refunds
CREATE OR REPLACE FUNCTION public.atomic_refund(p_user_id uuid, p_amount bigint)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET balance = balance + p_amount,
      total_spent = GREATEST(0, total_spent - p_amount),
      total_orders = GREATEST(0, total_orders - 1)
  WHERE user_id = p_user_id;
$$;

-- Function to get reseller tier discount for a user
CREATE OR REPLACE FUNCTION public.get_user_tier_discount(p_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(rt.discount_percent, 0)
  FROM public.profiles p
  LEFT JOIN public.reseller_tiers rt ON LOWER(p.tier) = LOWER(rt.name)
  WHERE p.user_id = p_user_id
  LIMIT 1;
$$;
