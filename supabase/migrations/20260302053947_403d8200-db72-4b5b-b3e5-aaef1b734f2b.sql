-- Drop the FK constraint that only allows imei_providers UUIDs
-- This allows products.provider_id to store api_providers UUIDs too
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_provider_id_fkey;