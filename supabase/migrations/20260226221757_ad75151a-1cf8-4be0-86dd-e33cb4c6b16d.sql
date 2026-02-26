
-- Drop the security definer view and recreate with security_invoker=on
DROP VIEW IF EXISTS public.recent_completions;

CREATE VIEW public.recent_completions
WITH (security_invoker = on) AS
  SELECT id, product_name, completed_at, created_at, status
  FROM public.orders
  WHERE status IN ('completed', 'delivered')
  ORDER BY completed_at DESC NULLS LAST
  LIMIT 50;

GRANT SELECT ON public.recent_completions TO anon, authenticated;

-- Add a public SELECT policy on orders for completed/delivered only
CREATE POLICY "Public can read completed orders limited"
  ON public.orders
  FOR SELECT
  USING (status IN ('completed', 'delivered'));
