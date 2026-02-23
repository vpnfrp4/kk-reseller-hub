
-- Atomic purchase function: deducts balance, assigns credential, creates order
CREATE OR REPLACE FUNCTION public.process_purchase(
  p_user_id UUID,
  p_product_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product RECORD;
  v_credential RECORD;
  v_order_id UUID;
BEGIN
  -- Lock and fetch product
  SELECT * INTO v_product FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;

  IF v_product.stock <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product out of stock');
  END IF;

  -- Check user balance (lock profile row)
  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id AND balance >= v_product.wholesale_price FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Grab first unsold credential
  SELECT * INTO v_credential FROM public.product_credentials
    WHERE product_id = p_product_id AND is_sold = false
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No credentials available. Please contact support.');
  END IF;

  -- Deduct balance
  UPDATE public.profiles
    SET balance = balance - v_product.wholesale_price,
        total_spent = total_spent + v_product.wholesale_price,
        total_orders = total_orders + 1
    WHERE user_id = p_user_id;

  -- Mark credential as sold
  UPDATE public.product_credentials
    SET is_sold = true, sold_to = p_user_id, sold_at = now()
    WHERE id = v_credential.id;

  -- Decrement stock
  UPDATE public.products SET stock = stock - 1 WHERE id = p_product_id;

  -- Create order
  INSERT INTO public.orders (user_id, product_name, credential_id, credentials, price, status)
    VALUES (
      p_user_id,
      v_product.name || ' ' || v_product.duration,
      v_credential.id,
      v_credential.credentials,
      v_product.wholesale_price,
      'delivered'
    )
    RETURNING id INTO v_order_id;

  -- Create wallet transaction record
  INSERT INTO public.wallet_transactions (user_id, type, amount, status, description)
    VALUES (
      p_user_id,
      'purchase',
      v_product.wholesale_price,
      'approved',
      v_product.name || ' ' || v_product.duration
    );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'credentials', v_credential.credentials,
    'product_name', v_product.name || ' ' || v_product.duration,
    'price', v_product.wholesale_price
  );
END;
$$;
