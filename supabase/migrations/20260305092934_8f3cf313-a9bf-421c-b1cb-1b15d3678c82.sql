
-- Service provider mappings: link one product to multiple provider services
CREATE TABLE public.service_provider_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.imei_providers(id) ON DELETE CASCADE,
  provider_service_id text NOT NULL,
  provider_price numeric NOT NULL DEFAULT 0,
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, provider_id, provider_service_id)
);

-- RLS
ALTER TABLE public.service_provider_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage service_provider_mappings"
  ON public.service_provider_mappings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read service_provider_mappings"
  ON public.service_provider_mappings FOR SELECT
  USING (true);

-- Index for fast lookups during routing
CREATE INDEX idx_spm_product_active ON public.service_provider_mappings(product_id, is_active, priority);
