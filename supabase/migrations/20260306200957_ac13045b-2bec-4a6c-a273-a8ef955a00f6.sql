
-- Admin Audit Logs table
CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL DEFAULT '',
  target_type text NOT NULL DEFAULT '',
  target_id text DEFAULT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text DEFAULT NULL,
  status text NOT NULL DEFAULT 'success',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for common queries
CREATE INDEX idx_audit_logs_admin ON public.admin_audit_logs(admin_user_id);
CREATE INDEX idx_audit_logs_created ON public.admin_audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.admin_audit_logs(action);

-- RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs"
  ON public.admin_audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
