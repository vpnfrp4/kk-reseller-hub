-- Unique composite index to prevent duplicate products per provider + service
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_provider_service_unique
  ON public.products (provider_id, api_service_id)
  WHERE provider_id IS NOT NULL AND api_service_id IS NOT NULL;