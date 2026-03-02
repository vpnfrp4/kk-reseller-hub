
-- Structured API logs table
CREATE TABLE public.api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  order_id uuid REFERENCES public.orders(id),
  user_id uuid,
  provider_id uuid,
  action text NOT NULL DEFAULT '',
  service_id text,
  request_url text,
  request_body jsonb,
  response_status integer,
  response_body jsonb,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  duration_ms integer,
  log_type text NOT NULL DEFAULT 'api_call'
);

-- Indexes for admin queries
CREATE INDEX idx_api_logs_created ON public.api_logs (created_at DESC);
CREATE INDEX idx_api_logs_type ON public.api_logs (log_type, created_at DESC);
CREATE INDEX idx_api_logs_provider ON public.api_logs (provider_id, created_at DESC);
CREATE INDEX idx_api_logs_order ON public.api_logs (order_id);
CREATE INDEX idx_api_logs_errors ON public.api_logs (success, created_at DESC) WHERE success = false;

-- Enable RLS
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can access
CREATE POLICY "Admins can read api_logs"
  ON public.api_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert api_logs"
  ON public.api_logs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));
