
-- Create a public view with limited columns for the landing page ticker
CREATE VIEW public.recent_completions
WITH (security_invoker = off) AS
  SELECT id, product_name, completed_at, created_at, status
  FROM public.orders
  WHERE status IN ('completed', 'delivered')
  ORDER BY completed_at DESC NULLS LAST
  LIMIT 50;

-- Grant access to anon and authenticated roles
GRANT SELECT ON public.recent_completions TO anon, authenticated;
