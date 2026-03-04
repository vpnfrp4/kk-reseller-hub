
CREATE TABLE public.ifree_services_cache (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  price TEXT,
  description TEXT,
  cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ifree_services_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ifree_services_cache"
  ON public.ifree_services_cache FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage ifree_services_cache"
  ON public.ifree_services_cache FOR ALL
  USING (true)
  WITH CHECK (true);
