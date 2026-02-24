
-- Add fulfillment configuration to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS fulfillment_modes jsonb NOT NULL DEFAULT '["instant"]'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_time_config jsonb NOT NULL DEFAULT '{"instant":"⚡ Instant Delivery","custom_username":"⏳ 5–30 Minutes","imei":"⏳ 5–30 Minutes","manual":"⏳ 1–24 Hours"}'::jsonb;

-- Custom fields per product
CREATE TABLE public.product_custom_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  required boolean NOT NULL DEFAULT true,
  min_length integer DEFAULT NULL,
  max_length integer DEFAULT NULL,
  linked_mode text NOT NULL,
  options jsonb DEFAULT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.product_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read custom fields"
  ON public.product_custom_fields FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert custom fields"
  ON public.product_custom_fields FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update custom fields"
  ON public.product_custom_fields FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete custom fields"
  ON public.product_custom_fields FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add fulfillment metadata to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_mode text NOT NULL DEFAULT 'instant',
  ADD COLUMN IF NOT EXISTS custom_fields_data jsonb DEFAULT NULL;
