
-- Add placeholder and validation_rule columns to product_custom_fields
ALTER TABLE public.product_custom_fields 
  ADD COLUMN IF NOT EXISTS placeholder text DEFAULT '',
  ADD COLUMN IF NOT EXISTS validation_rule text DEFAULT '';
