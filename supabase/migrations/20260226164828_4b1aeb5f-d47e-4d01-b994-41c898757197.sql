
-- Table to store admin-configurable payment method settings
CREATE TABLE public.payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  method_id text NOT NULL UNIQUE, -- e.g. 'kpay', 'wavepay', 'binance'
  provider text NOT NULL,
  name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  binance_uid text DEFAULT '',
  network text DEFAULT '',
  accepted_currency text DEFAULT '',
  min_deposit bigint NOT NULL DEFAULT 5000,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Everyone can read active methods
CREATE POLICY "Authenticated can read payment methods"
  ON public.payment_methods FOR SELECT USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage payment methods"
  ON public.payment_methods FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default payment methods
INSERT INTO public.payment_methods (method_id, provider, name, phone, min_deposit, sort_order) VALUES
  ('kpay', 'KBZ Pay', 'Htun Arkar Kyaw', '09787313137', 5000, 1),
  ('wavepay', 'Wave Pay', 'Hnin Thet Wai', '09777818691', 5000, 2);

INSERT INTO public.payment_methods (method_id, provider, name, binance_uid, network, accepted_currency, min_deposit, sort_order) VALUES
  ('binance', 'Binance', '', '477879311', 'TRC20', 'USDT', 5000, 3);
