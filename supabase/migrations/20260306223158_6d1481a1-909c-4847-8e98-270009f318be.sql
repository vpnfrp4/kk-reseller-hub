
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_popular boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS popular_sort_order integer NOT NULL DEFAULT 0;

-- Add system setting for max popular services displayed
INSERT INTO public.system_settings (key, value)
VALUES ('popular_services_config', '{"max_display": 6}'::jsonb)
ON CONFLICT (key) DO NOTHING;
