
-- Add reseller management columns to profiles
ALTER TABLE public.profiles
ADD COLUMN status text NOT NULL DEFAULT 'active',
ADD COLUMN is_verified boolean NOT NULL DEFAULT false,
ADD COLUMN tier text NOT NULL DEFAULT 'bronze',
ADD COLUMN credit_limit bigint NOT NULL DEFAULT 0,
ADD COLUMN last_active_at timestamp with time zone;

-- Create reseller tiers configuration table
CREATE TABLE public.reseller_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  discount_percent numeric NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#888888',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.reseller_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tiers" ON public.reseller_tiers
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can read tiers" ON public.reseller_tiers
  FOR SELECT USING (true);

-- Insert default tiers
INSERT INTO public.reseller_tiers (name, discount_percent, color, sort_order) VALUES
  ('Bronze', 0, '#CD7F32', 1),
  ('Silver', 5, '#C0C0C0', 2),
  ('Gold', 10, '#FFD700', 3),
  ('Platinum', 15, '#E5E4E2', 4);

-- Create login history table
CREATE TABLE public.login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all login history" ON public.login_history
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert login history" ON public.login_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own login history" ON public.login_history
  FOR SELECT USING (auth.uid() = user_id);
