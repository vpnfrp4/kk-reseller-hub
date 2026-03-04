
-- Add admin-editable fields to ifree_services_cache
ALTER TABLE public.ifree_services_cache 
  ADD COLUMN IF NOT EXISTS custom_name text,
  ADD COLUMN IF NOT EXISTS selling_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS service_group text DEFAULT 'General';
