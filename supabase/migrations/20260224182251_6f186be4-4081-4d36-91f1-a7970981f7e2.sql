-- Create pricing tiers table
CREATE TABLE public.pricing_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  min_qty INTEGER NOT NULL DEFAULT 1,
  max_qty INTEGER, -- NULL means unlimited
  unit_price BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;

-- Everyone can read pricing tiers
CREATE POLICY "Authenticated users can read pricing tiers"
  ON public.pricing_tiers FOR SELECT
  USING (true);

-- Only admins can manage
CREATE POLICY "Admins can insert pricing tiers"
  ON public.pricing_tiers FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update pricing tiers"
  ON public.pricing_tiers FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete pricing tiers"
  ON public.pricing_tiers FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index
CREATE INDEX idx_pricing_tiers_product ON public.pricing_tiers (product_id, min_qty);

-- Replace the process_purchase function to support quantity and tiered pricing
CREATE OR REPLACE FUNCTION public.process_purchase(p_user_id uuid, p_product_id uuid, p_quantity integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_product RECORD;
  v_tier RECORD;
  v_unit_price BIGINT;
  v_total_price BIGINT;
  v_credential RECORD;
  v_order_id UUID;
  v_credentials_list TEXT[] := '{}';
  v_credential_ids UUID[] := '{}';
  v_i INTEGER;
BEGIN
  -- Validate quantity
  IF p_quantity < 1 OR p_quantity > 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid quantity (1-100)');
  END IF;

  -- Lock and fetch product
  SELECT * INTO v_product FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;

  IF v_product.stock < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough stock. Only ' || v_product.stock || ' available.');
  END IF;

  -- Determine tiered unit price
  SELECT unit_price INTO v_unit_price
    FROM public.pricing_tiers
    WHERE product_id = p_product_id
      AND p_quantity >= min_qty
      AND (max_qty IS NULL OR p_quantity <= max_qty)
    ORDER BY min_qty DESC
    LIMIT 1;

  -- Fall back to wholesale_price if no tier found
  IF v_unit_price IS NULL THEN
    v_unit_price := v_product.wholesale_price;
  END IF;

  v_total_price := v_unit_price * p_quantity;

  -- Check user balance
  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id AND balance >= v_total_price FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Grab credentials
  FOR v_i IN 1..p_quantity LOOP
    SELECT * INTO v_credential FROM public.product_credentials
      WHERE product_id = p_product_id AND is_sold = false
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'No credentials available. Only ' || (v_i - 1) || ' could be assigned.');
    END IF;

    -- Mark credential as sold
    UPDATE public.product_credentials
      SET is_sold = true, sold_to = p_user_id, sold_at = now()
      WHERE id = v_credential.id;

    v_credentials_list := v_credentials_list || v_credential.credentials;
    v_credential_ids := v_credential_ids || v_credential.id;
  END LOOP;

  -- Deduct balance
  UPDATE public.profiles
    SET balance = balance - v_total_price,
        total_spent = total_spent + v_total_price,
        total_orders = total_orders + p_quantity
    WHERE user_id = p_user_id;

  -- Decrement stock
  UPDATE public.products SET stock = stock - p_quantity WHERE id = p_product_id;

  -- Create order (store all credentials joined)
  INSERT INTO public.orders (user_id, product_name, credential_id, credentials, price, status)
    VALUES (
      p_user_id,
      v_product.name || ' ' || v_product.duration || CASE WHEN p_quantity > 1 THEN ' (x' || p_quantity || ')' ELSE '' END,
      v_credential_ids[1],
      array_to_string(v_credentials_list, E'\n'),
      v_total_price,
      'delivered'
    )
    RETURNING id INTO v_order_id;

  -- Create wallet transaction
  INSERT INTO public.wallet_transactions (user_id, type, amount, status, description)
    VALUES (
      p_user_id,
      'purchase',
      v_total_price,
      'approved',
      v_product.name || ' ' || v_product.duration || CASE WHEN p_quantity > 1 THEN ' x' || p_quantity ELSE '' END
    );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'credentials', array_to_string(v_credentials_list, E'\n'),
    'product_name', v_product.name || ' ' || v_product.duration,
    'price', v_total_price,
    'quantity', p_quantity,
    'unit_price', v_unit_price
  );
END;
$function$;