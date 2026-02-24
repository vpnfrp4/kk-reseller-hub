-- Add sort_order column to products table
ALTER TABLE public.products ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

-- Initialize sort_order based on existing created_at order
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
  FROM public.products
)
UPDATE public.products SET sort_order = ordered.rn FROM ordered WHERE products.id = ordered.id;