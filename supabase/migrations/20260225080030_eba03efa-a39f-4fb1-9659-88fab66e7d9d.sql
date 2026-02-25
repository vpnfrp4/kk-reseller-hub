
CREATE OR REPLACE FUNCTION public.process_purchase(
  p_user_id uuid,
  p_product_id uuid,
  p_quantity integer DEFAULT 1,
  p_fulfillment_mode text DEFAULT 'instant'
)
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
  v_is_manual BOOLEAN;
  v_admin RECORD;
  v_buyer_name TEXT;
BEGIN
  IF p_quantity < 1 OR p_quantity > 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid quantity (1-100)');
  END IF;

  v_is_manual := (p_fulfillment_mode = 'manual');

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;

  IF NOT v_is_manual AND v_product.stock < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough stock. Only ' || v_product.stock || ' available.');
  END IF;

  SELECT unit_price INTO v_unit_price
    FROM public.pricing_tiers
    WHERE product_id = p_product_id
      AND p_quantity >= min_qty
      AND (max_qty IS NULL OR p_quantity <= max_qty)
    ORDER BY min_qty DESC
    LIMIT 1;

  IF v_unit_price IS NULL THEN
    v_unit_price := v_product.wholesale_price;
  END IF;

  v_total_price := v_unit_price * p_quantity;

  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id AND balance >= v_total_price FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  IF v_is_manual THEN
    v_credentials_list := ARRAY['Pending manual fulfillment'];
  ELSE
    FOR v_i IN 1..p_quantity LOOP
      SELECT * INTO v_credential FROM public.product_credentials
        WHERE product_id = p_product_id AND is_sold = false
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED;

      IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No credentials available. Only ' || (v_i - 1) || ' could be assigned.');
      END IF;

      UPDATE public.product_credentials
        SET is_sold = true, sold_to = p_user_id, sold_at = now()
        WHERE id = v_credential.id;

      v_credentials_list := v_credentials_list || v_credential.credentials;
      v_credential_ids := v_credential_ids || v_credential.id;
    END LOOP;
  END IF;

  UPDATE public.profiles
    SET balance = balance - v_total_price,
        total_spent = total_spent + v_total_price,
        total_orders = total_orders + p_quantity
    WHERE user_id = p_user_id;

  IF NOT v_is_manual THEN
    UPDATE public.products SET stock = stock - p_quantity WHERE id = p_product_id;
  END IF;

  INSERT INTO public.orders (user_id, product_name, credential_id, credentials, price, status, fulfillment_mode)
    VALUES (
      p_user_id,
      v_product.name || ' ' || v_product.duration || CASE WHEN p_quantity > 1 THEN ' (x' || p_quantity || ')' ELSE '' END,
      CASE WHEN v_is_manual THEN NULL ELSE v_credential_ids[1] END,
      array_to_string(v_credentials_list, E'\n'),
      v_total_price,
      CASE WHEN v_is_manual THEN 'pending_review' ELSE 'delivered' END,
      p_fulfillment_mode
    )
    RETURNING id INTO v_order_id;

  INSERT INTO public.wallet_transactions (user_id, type, amount, status, description)
    VALUES (
      p_user_id,
      'purchase',
      v_total_price,
      'approved',
      v_product.name || ' ' || v_product.duration || CASE WHEN p_quantity > 1 THEN ' x' || p_quantity ELSE '' END
    );

  -- Notify all admins for manual fulfillment orders with a direct link
  IF v_is_manual THEN
    SELECT name INTO v_buyer_name FROM public.profiles WHERE user_id = p_user_id;

    FOR v_admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, title, body, type, link)
        VALUES (
          v_admin.user_id,
          '🔔 Manual Order Pending',
          COALESCE(v_buyer_name, 'A reseller') || ' ordered ' || v_product.name || ' ' || v_product.duration
            || CASE WHEN p_quantity > 1 THEN ' (x' || p_quantity || ')' ELSE '' END
            || ' — ' || v_total_price || ' MMK. Awaiting fulfillment.',
          'order',
          '/admin/orders?order=' || v_order_id::text
        );
    END LOOP;
  END IF;

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
