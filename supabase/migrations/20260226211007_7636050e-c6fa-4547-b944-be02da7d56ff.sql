
-- ===================================================
-- 1. Extend imei_providers with marketplace fields
-- ===================================================
ALTER TABLE public.imei_providers
  ADD COLUMN IF NOT EXISTS avg_rating numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_reviews integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_completed integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS success_rate numeric DEFAULT 100,
  ADD COLUMN IF NOT EXISTS commission_percent numeric DEFAULT 8,
  ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS fulfillment_type text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS logo_url text;

-- ===================================================
-- 2. Create order_reviews table
-- ===================================================
CREATE TABLE public.order_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  provider_id uuid REFERENCES public.imei_providers(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

ALTER TABLE public.order_reviews ENABLE ROW LEVEL SECURITY;

-- Users can read all reviews (marketplace transparency)
CREATE POLICY "Anyone can read reviews"
  ON public.order_reviews FOR SELECT
  USING (true);

-- Users can insert reviews for their own orders
CREATE POLICY "Users can insert own reviews"
  ON public.order_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON public.order_reviews FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can manage all reviews
CREATE POLICY "Admins can manage reviews"
  ON public.order_reviews FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ===================================================
-- 3. Function to recalculate provider stats
-- ===================================================
CREATE OR REPLACE FUNCTION public.recalculate_provider_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_provider_id uuid;
  v_avg numeric;
  v_count integer;
BEGIN
  -- Get provider from the order's product
  SELECT p.provider_id INTO v_provider_id
  FROM public.orders o
  JOIN public.products p ON p.id = o.product_id
  WHERE o.id = COALESCE(NEW.order_id, OLD.order_id);

  IF v_provider_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Recalculate
  SELECT COALESCE(AVG(r.rating), 0), COUNT(r.id)
  INTO v_avg, v_count
  FROM public.order_reviews r
  JOIN public.orders o ON o.id = r.order_id
  JOIN public.products p ON p.id = o.product_id
  WHERE p.provider_id = v_provider_id;

  UPDATE public.imei_providers
  SET avg_rating = ROUND(v_avg, 1),
      total_reviews = v_count
  WHERE id = v_provider_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_recalc_provider_stats
AFTER INSERT OR UPDATE OR DELETE ON public.order_reviews
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_provider_stats();

-- ===================================================
-- 4. Function to update provider completed count on order completion
-- ===================================================
CREATE OR REPLACE FUNCTION public.update_provider_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_provider_id uuid;
  v_completed integer;
  v_total integer;
  v_rate numeric;
BEGIN
  IF NEW.status IN ('completed', 'delivered') AND OLD.status NOT IN ('completed', 'delivered') THEN
    SELECT p.provider_id INTO v_provider_id
    FROM public.products p WHERE p.id = NEW.product_id;

    IF v_provider_id IS NOT NULL THEN
      SELECT
        COUNT(*) FILTER (WHERE status IN ('completed', 'delivered')),
        COUNT(*)
      INTO v_completed, v_total
      FROM public.orders
      WHERE product_id IN (SELECT id FROM public.products WHERE provider_id = v_provider_id)
        AND status NOT IN ('pending', 'pending_review');

      v_rate := CASE WHEN v_total > 0 THEN ROUND((v_completed::numeric / v_total) * 100, 1) ELSE 100 END;

      UPDATE public.imei_providers
      SET total_completed = v_completed,
          success_rate = v_rate
      WHERE id = v_provider_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_provider_completed
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_provider_completed();

-- Enable realtime for reviews
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_reviews;
