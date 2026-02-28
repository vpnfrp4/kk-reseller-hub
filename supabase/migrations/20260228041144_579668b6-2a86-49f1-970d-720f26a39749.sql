
-- Drop the old sequence-based trigger (no longer needed)
DROP TRIGGER IF EXISTS trg_generate_product_code ON public.products;

-- Set a reliable UUID-based default for product_code
ALTER TABLE public.products 
  ALTER COLUMN product_code SET DEFAULT ('PRD-' || replace(gen_random_uuid()::text, '-', ''));

-- Backfill any empty/null product_codes (safety net)
UPDATE public.products 
SET product_code = 'PRD-' || replace(gen_random_uuid()::text, '-', '')
WHERE product_code IS NULL OR product_code = '';
