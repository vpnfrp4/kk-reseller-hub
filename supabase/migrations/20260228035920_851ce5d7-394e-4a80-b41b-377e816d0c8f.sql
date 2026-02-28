
-- Fix any existing duplicates first by appending a suffix
WITH dupes AS (
  SELECT id, product_code,
         ROW_NUMBER() OVER (PARTITION BY product_code ORDER BY created_at) AS rn
  FROM public.products
)
UPDATE public.products p
SET product_code = p.product_code || '-' || dupes.rn
FROM dupes
WHERE dupes.id = p.id AND dupes.rn > 1;

-- Ensure the sequence exists
CREATE SEQUENCE IF NOT EXISTS public.product_code_seq;

-- Re-create the trigger to guarantee it's attached
DROP TRIGGER IF EXISTS trg_generate_product_code ON public.products;
CREATE TRIGGER trg_generate_product_code
  BEFORE INSERT ON public.products
  FOR EACH ROW
  WHEN (NEW.product_code IS NULL OR NEW.product_code = '')
  EXECUTE FUNCTION public.generate_product_code();

-- Add unique constraint
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_product_code_key;
ALTER TABLE public.products
  ADD CONSTRAINT products_product_code_key UNIQUE (product_code);
