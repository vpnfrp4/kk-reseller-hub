
-- Table to track all iFree IMEI check lookups
CREATE TABLE public.ifree_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  imei text NOT NULL,
  service_id text NOT NULL,
  service_name text NOT NULL DEFAULT '',
  response_text text,
  account_balance text,
  error_message text,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ifree_checks ENABLE ROW LEVEL SECURITY;

-- Admins can read all checks
CREATE POLICY "Admins can read all ifree_checks"
  ON public.ifree_checks FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Admins can insert (edge function uses service role)
CREATE POLICY "Admins can insert ifree_checks"
  ON public.ifree_checks FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Users can read own checks
CREATE POLICY "Users can read own ifree_checks"
  ON public.ifree_checks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert own checks
CREATE POLICY "Users can insert own ifree_checks"
  ON public.ifree_checks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_ifree_checks_user_id ON public.ifree_checks(user_id);
CREATE INDEX idx_ifree_checks_created_at ON public.ifree_checks(created_at DESC);
