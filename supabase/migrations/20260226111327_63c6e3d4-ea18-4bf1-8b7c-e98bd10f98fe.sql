
-- ========================
-- Lookup tables
-- ========================

-- Brands
CREATE TABLE public.imei_brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.imei_brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read imei_brands" ON public.imei_brands FOR SELECT USING (true);
CREATE POLICY "Admins can manage imei_brands" ON public.imei_brands FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Countries
CREATE TABLE public.imei_countries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.imei_countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read imei_countries" ON public.imei_countries FOR SELECT USING (true);
CREATE POLICY "Admins can manage imei_countries" ON public.imei_countries FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Carriers (linked to country)
CREATE TABLE public.imei_carriers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  country_id UUID NOT NULL REFERENCES public.imei_countries(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, country_id)
);
ALTER TABLE public.imei_carriers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read imei_carriers" ON public.imei_carriers FOR SELECT USING (true);
CREATE POLICY "Admins can manage imei_carriers" ON public.imei_carriers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Providers (API providers)
CREATE TABLE public.imei_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  api_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.imei_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read imei_providers" ON public.imei_providers FOR SELECT USING (true);
CREATE POLICY "Admins can manage imei_providers" ON public.imei_providers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ========================
-- Update imei_services with new columns
-- ========================
ALTER TABLE public.imei_services
  ADD COLUMN brand_id UUID REFERENCES public.imei_brands(id),
  ADD COLUMN country_id UUID REFERENCES public.imei_countries(id),
  ADD COLUMN carrier_id UUID REFERENCES public.imei_carriers(id),
  ADD COLUMN provider_id UUID REFERENCES public.imei_providers(id),
  ADD COLUMN provider_price BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN margin_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN final_price BIGINT NOT NULL DEFAULT 0;

-- Seed some initial brands from existing data
INSERT INTO public.imei_brands (name) 
SELECT DISTINCT brand FROM public.imei_services 
ON CONFLICT (name) DO NOTHING;

-- Seed countries from existing data  
INSERT INTO public.imei_countries (name)
SELECT DISTINCT country FROM public.imei_services WHERE country != 'All'
ON CONFLICT (name) DO NOTHING;
INSERT INTO public.imei_countries (name) VALUES ('All') ON CONFLICT (name) DO NOTHING;

-- Backfill brand_id from existing brand text
UPDATE public.imei_services s
SET brand_id = b.id
FROM public.imei_brands b
WHERE s.brand = b.name;

-- Backfill country_id from existing country text
UPDATE public.imei_services s
SET country_id = c.id
FROM public.imei_countries c
WHERE s.country = c.name;

-- Copy price to final_price for existing rows
UPDATE public.imei_services SET final_price = price WHERE final_price = 0 AND price > 0;
