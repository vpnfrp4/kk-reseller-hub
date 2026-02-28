
-- 1. Create a public-safe view for imei_providers (excludes api_url, commission_percent)
CREATE VIEW public.imei_providers_public
WITH (security_invoker = on) AS
SELECT
  id, name, logo_url, status, sort_order, created_at,
  avg_rating, total_reviews, total_completed, success_rate,
  is_verified, fulfillment_type
FROM public.imei_providers;

-- 2. Drop the existing public read policy on imei_providers
DROP POLICY IF EXISTS "Public can read imei_providers" ON public.imei_providers;

-- 3. Replace with admin-only SELECT on the base table
CREATE POLICY "Only admins can read imei_providers"
ON public.imei_providers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
