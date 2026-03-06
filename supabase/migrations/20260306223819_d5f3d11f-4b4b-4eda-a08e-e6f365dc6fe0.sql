
-- Product downloads table
CREATE TABLE public.product_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  download_type text NOT NULL DEFAULT 'external_link',
  file_url text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  file_size bigint DEFAULT 0,
  file_version text DEFAULT '',
  link_text text DEFAULT 'Download',
  open_new_tab boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  system_requirements text DEFAULT '',
  release_date date DEFAULT null,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Download settings per product (stored as JSON in system_settings pattern, but per-product)
CREATE TABLE public.product_download_settings (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  require_login boolean DEFAULT true,
  show_on_thankyou boolean DEFAULT true,
  send_via_email boolean DEFAULT false,
  download_limit integer DEFAULT null,
  download_expiry_days integer DEFAULT null,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Download logs for tracking
CREATE TABLE public.download_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  download_id uuid NOT NULL REFERENCES public.product_downloads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  ip_address text DEFAULT null,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for product_downloads
ALTER TABLE public.product_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage product_downloads"
  ON public.product_downloads FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read product_downloads"
  ON public.product_downloads FOR SELECT
  USING (true);

-- RLS for product_download_settings
ALTER TABLE public.product_download_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage download_settings"
  ON public.product_download_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read download_settings"
  ON public.product_download_settings FOR SELECT
  USING (true);

-- RLS for download_logs
ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage download_logs"
  ON public.download_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own download_logs"
  ON public.download_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own download_logs"
  ON public.download_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Storage bucket for product downloads
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('product-downloads', 'product-downloads', false, 104857600);

-- Storage RLS: admins can upload, authenticated users can read with signed URLs
CREATE POLICY "Admins can upload product downloads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-downloads' AND (SELECT has_role(auth.uid(), 'admin')));

CREATE POLICY "Admins can update product downloads"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-downloads' AND (SELECT has_role(auth.uid(), 'admin')));

CREATE POLICY "Admins can delete product downloads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-downloads' AND (SELECT has_role(auth.uid(), 'admin')));

CREATE POLICY "Authenticated can read product downloads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-downloads' AND auth.role() = 'authenticated');
