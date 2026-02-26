
-- ═══════════════════════════════════════════════════
-- IMEI Services Marketplace Schema
-- ═══════════════════════════════════════════════════

-- IMEI Services catalog
CREATE TABLE public.imei_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  service_name TEXT NOT NULL,
  carrier TEXT NOT NULL DEFAULT 'All',
  country TEXT NOT NULL DEFAULT 'All',
  processing_time TEXT NOT NULL DEFAULT '1-24 Hours',
  price BIGINT NOT NULL,
  fulfillment_mode TEXT NOT NULL DEFAULT 'manual',
  api_provider TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.imei_services ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read active services
CREATE POLICY "Authenticated users can read active imei services"
  ON public.imei_services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert imei services"
  ON public.imei_services FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update imei services"
  ON public.imei_services FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete imei services"
  ON public.imei_services FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- IMEI Orders
CREATE TABLE public.imei_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  imei_service_id UUID NOT NULL REFERENCES public.imei_services(id),
  imei_number TEXT NOT NULL,
  price BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.imei_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own imei orders"
  ON public.imei_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own imei orders"
  ON public.imei_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all imei orders"
  ON public.imei_orders FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update imei orders"
  ON public.imei_orders FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Also allow public (unauthenticated) read for the marketplace browsing
CREATE POLICY "Public can read active imei services"
  ON public.imei_services FOR SELECT
  TO anon
  USING (status = 'active');

-- Enable realtime for imei_orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.imei_orders;

-- Create indexes
CREATE INDEX idx_imei_services_brand ON public.imei_services(brand);
CREATE INDEX idx_imei_services_status ON public.imei_services(status);
CREATE INDEX idx_imei_orders_user_id ON public.imei_orders(user_id);
CREATE INDEX idx_imei_orders_status ON public.imei_orders(status);

-- Purchase function for IMEI services
CREATE OR REPLACE FUNCTION public.process_imei_purchase(
  p_user_id UUID,
  p_service_id UUID,
  p_imei_number TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_service RECORD;
  v_order_id UUID;
  v_buyer_name TEXT;
  v_admin RECORD;
BEGIN
  -- Validate IMEI format
  IF LENGTH(p_imei_number) != 15 OR p_imei_number !~ '^\d{15}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid IMEI number. Must be exactly 15 digits.');
  END IF;

  -- Get service
  SELECT * INTO v_service FROM public.imei_services WHERE id = p_service_id AND status = 'active';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service not found or inactive.');
  END IF;

  -- Check balance
  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id AND balance >= v_service.price FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance.');
  END IF;

  -- Deduct balance
  UPDATE public.profiles
    SET balance = balance - v_service.price,
        total_spent = total_spent + v_service.price,
        total_orders = total_orders + 1
    WHERE user_id = p_user_id;

  -- Create IMEI order
  INSERT INTO public.imei_orders (user_id, imei_service_id, imei_number, price, status)
    VALUES (p_user_id, p_service_id, p_imei_number, v_service.price, 'pending')
    RETURNING id INTO v_order_id;

  -- Wallet transaction
  INSERT INTO public.wallet_transactions (user_id, type, amount, status, description)
    VALUES (p_user_id, 'purchase', v_service.price, 'approved',
            'IMEI: ' || v_service.service_name || ' (' || v_service.brand || ')');

  -- Notify admins
  SELECT name INTO v_buyer_name FROM public.profiles WHERE user_id = p_user_id;

  FOR v_admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (
        v_admin.user_id,
        'IMEI Order Received',
        COALESCE(v_buyer_name, 'A reseller') || ' ordered ' || v_service.service_name
          || ' (' || v_service.brand || ') — IMEI: ' || p_imei_number,
        'order',
        '/admin/imei-orders?order=' || v_order_id::text
      );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'service_name', v_service.service_name,
    'brand', v_service.brand,
    'price', v_service.price
  );
END;
$$;
