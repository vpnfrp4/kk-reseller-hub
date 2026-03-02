
-- Add external_order_id and provider_response columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS external_order_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS provider_response jsonb;

-- Index for the cron job query
CREATE INDEX IF NOT EXISTS idx_orders_processing_external ON public.orders (status) WHERE status = 'processing' AND external_order_id IS NOT NULL;

-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
