-- Add api_service_id to products for mapping to external SMM panel service
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS api_service_id text;

-- Add api_key to imei_providers for SMM panel auth (api_url already exists)
ALTER TABLE public.imei_providers ADD COLUMN IF NOT EXISTS api_key text;

-- Add min/max quantity columns for API-fetched constraints
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS api_min_quantity integer DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS api_max_quantity integer;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS api_refill boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS api_rate numeric;
