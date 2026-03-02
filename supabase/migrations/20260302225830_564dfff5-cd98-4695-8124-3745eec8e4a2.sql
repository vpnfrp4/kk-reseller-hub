
-- Create a sequence starting at 1001 for 4-5 digit IDs
CREATE SEQUENCE IF NOT EXISTS public.product_display_id_seq START WITH 1001 INCREMENT BY 1;

-- Add display_id column
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS display_id integer;

-- Backfill existing products with sequential IDs (ordered by created_at)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.products ORDER BY created_at ASC LOOP
    UPDATE public.products SET display_id = nextval('public.product_display_id_seq') WHERE id = r.id;
  END LOOP;
END;
$$;

-- Make it NOT NULL and UNIQUE after backfill
ALTER TABLE public.products ALTER COLUMN display_id SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN display_id SET DEFAULT nextval('public.product_display_id_seq');
ALTER TABLE public.products ADD CONSTRAINT products_display_id_unique UNIQUE (display_id);
