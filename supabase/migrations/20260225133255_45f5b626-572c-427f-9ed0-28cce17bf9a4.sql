
-- Add product type column: 'auto' for stock-based, 'manual' for custom orders
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'auto';

-- Backfill existing products: if fulfillment_modes contains 'manual', set type to 'manual'
UPDATE public.products
SET type = 'manual'
WHERE fulfillment_modes::text LIKE '%manual%'
  AND type = 'auto';

-- Also treat custom_username and imei-only products as manual
UPDATE public.products
SET type = 'manual'
WHERE NOT (fulfillment_modes::text LIKE '%instant%')
  AND type = 'auto'
  AND (fulfillment_modes::text LIKE '%custom_username%' OR fulfillment_modes::text LIKE '%imei%');
