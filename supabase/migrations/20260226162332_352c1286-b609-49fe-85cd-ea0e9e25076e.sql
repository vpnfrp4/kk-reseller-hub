
-- Step 1: Add new columns to products table for unified product types
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'digital',
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS carrier text,
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.imei_brands(id),
  ADD COLUMN IF NOT EXISTS country_id uuid REFERENCES public.imei_countries(id),
  ADD COLUMN IF NOT EXISTS carrier_id uuid REFERENCES public.imei_carriers(id),
  ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES public.imei_providers(id),
  ADD COLUMN IF NOT EXISTS provider_price bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_percent numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_price bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_time text DEFAULT 'Instant',
  ADD COLUMN IF NOT EXISTS api_provider text;

-- Step 2: Migrate imei_services into products
INSERT INTO public.products (
  name, product_type, brand, country, carrier, brand_id, country_id, carrier_id,
  provider_id, provider_price, margin_percent, final_price, processing_time,
  api_provider, wholesale_price, retail_price, duration, type, category,
  description, sort_order, stock, fulfillment_modes
)
SELECT
  s.service_name,
  'imei',
  s.brand,
  s.country,
  s.carrier,
  s.brand_id,
  s.country_id,
  s.carrier_id,
  s.provider_id,
  s.provider_price,
  s.margin_percent,
  s.final_price,
  s.processing_time,
  s.api_provider,
  s.price,           -- wholesale = price
  s.price,           -- retail = price
  s.processing_time, -- duration = processing_time
  CASE WHEN s.fulfillment_mode = 'api' THEN 'auto' ELSE 'manual' END,
  'IMEI Unlock',
  s.service_name,
  s.sort_order,
  0,                 -- no stock for IMEI
  CASE WHEN s.fulfillment_mode = 'api' 
    THEN '["api"]'::jsonb 
    ELSE '["manual"]'::jsonb 
  END
FROM public.imei_services s
WHERE s.status = 'active';

-- Step 3: Update existing products to have proper product_type
UPDATE public.products SET product_type = 'manual' WHERE type = 'manual' AND product_type = 'digital';

-- Step 4: Add imei columns to orders table for unified order handling
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'digital',
  ADD COLUMN IF NOT EXISTS imei_number text,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS result text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id);

-- Step 5: Migrate imei_orders into orders
INSERT INTO public.orders (
  user_id, product_name, price, status, product_type, imei_number,
  admin_notes, result, completed_at, created_at, fulfillment_mode, credentials
)
SELECT
  io.user_id,
  COALESCE(s.service_name, 'IMEI Service') || ' (' || COALESCE(s.brand, '') || ')',
  io.price,
  io.status,
  'imei',
  io.imei_number,
  io.admin_notes,
  io.result,
  io.completed_at,
  io.created_at,
  COALESCE(s.fulfillment_mode, 'manual'),
  COALESCE(io.result, '')
FROM public.imei_orders io
LEFT JOIN public.imei_services s ON io.imei_service_id = s.id;

-- Step 6: Create sync trigger for IMEI product final_price
CREATE OR REPLACE FUNCTION public.sync_product_final_price()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.product_type = 'imei' AND NEW.final_price > 0 THEN
    NEW.wholesale_price := NEW.final_price;
    NEW.retail_price := NEW.final_price;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_product_final_price
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_final_price();
