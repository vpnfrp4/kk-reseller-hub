
-- System settings key-value table
CREATE TABLE public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
  ON public.system_settings FOR SELECT USING (true);

CREATE POLICY "Admins can manage settings"
  ON public.system_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed default USD rate
INSERT INTO public.system_settings (key, value)
VALUES ('usd_mmk_rate', '{"rate": 2100}');

-- Add base_currency and base_price to products
ALTER TABLE public.products
  ADD COLUMN base_currency text NOT NULL DEFAULT 'MMK',
  ADD COLUMN base_price bigint NOT NULL DEFAULT 0;

-- Initialize base_price from wholesale_price for existing products
UPDATE public.products SET base_price = wholesale_price;

-- Function to recalculate all USD-based product prices
CREATE OR REPLACE FUNCTION public.recalculate_usd_prices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rate numeric;
BEGIN
  SELECT (value->>'rate')::numeric INTO v_rate
  FROM public.system_settings WHERE key = 'usd_mmk_rate';

  IF v_rate IS NULL OR v_rate <= 0 THEN
    RAISE EXCEPTION 'Invalid USD rate';
  END IF;

  UPDATE public.products
  SET wholesale_price = (base_price * v_rate)::bigint,
      retail_price = CASE
        WHEN margin_percent > 0 THEN ((base_price * v_rate) * (1 + margin_percent / 100))::bigint
        ELSE retail_price
      END
  WHERE base_currency = 'USD';
END;
$$;

-- Trigger: auto-recalculate when USD rate changes
CREATE OR REPLACE FUNCTION public.on_usd_rate_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.key = 'usd_mmk_rate' THEN
    PERFORM public.recalculate_usd_prices();
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_usd_rate_change
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.on_usd_rate_change();
