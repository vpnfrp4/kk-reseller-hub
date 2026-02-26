
-- Drop all overloaded versions of process_purchase and recreate as single unified function
DROP FUNCTION IF EXISTS public.process_purchase(uuid, uuid);
DROP FUNCTION IF EXISTS public.process_purchase(uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.process_purchase(uuid, uuid, integer, text);

CREATE OR REPLACE FUNCTION public.process_purchase(
  p_user_id uuid,
  p_product_id uuid,
  p_quantity integer DEFAULT 1,
  p_fulfillment_mode text DEFAULT 'instant',
  p_imei_number text DEFAULT NULL,
  p_custom_fields jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_product RECORD;
  v_unit_price BIGINT;
  v_total_price BIGINT;
  v_credential RECORD;
  v_order_id UUID;
  v_credentials_list TEXT[] := '{}';
  v_credential_ids UUID[] := '{}';
  v_i INTEGER;
  v_ptype TEXT;
  v_order_status TEXT;
  v_order_mode TEXT;
  v_admin RECORD;
  v_buyer_name TEXT;
  v_notif_title TEXT;
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

  v_ptype := v_product.product_type;

  -- === IMEI validation ===
  IF v_ptype = 'imei' THEN
    IF p_imei_number IS NULL OR LENGTH(p_imei_number) != 15 OR p_imei_number !~ '^\d{15}$' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid IMEI number. Must be exactly 15 digits.');
    END IF;
    -- Force quantity 1 for IMEI
    IF p_quantity != 1 THEN
      RETURN jsonb_build_object('success', false, 'error', 'IMEI orders must have quantity 1.');
    END IF;
  END IF;

  -- === Stock check (digital only) ===
  IF v_ptype = 'digital' THEN
    IF v_product.stock < p_quantity THEN
      RETURN jsonb_build_object('success', false, 'error', 'Not enough stock. Only ' || v_product.stock || ' available.');
    END IF;
  END IF;

  -- === Determine unit price ===
  IF v_ptype = 'imei' THEN
    -- IMEI uses final_price (or wholesale_price synced by trigger)
    v_unit_price := v_product.wholesale_price;
  ELSE
    -- Check tiered pricing
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
  END IF;

  v_total_price := v_unit_price * p_quantity;

  -- === Balance check ===
  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id AND balance >= v_total_price FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- === Credential assignment (digital only) ===
  IF v_ptype = 'digital' THEN
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
  ELSIF v_ptype = 'imei' THEN
    v_credentials_list := ARRAY['IMEI: ' || p_imei_number];
  ELSIF v_ptype = 'manual' THEN
    v_credentials_list := ARRAY['Pending manual fulfillment'];
  ELSIF v_ptype = 'api' THEN
    v_credentials_list := ARRAY['Pending API fulfillment'];
  END IF;

  -- === Deduct balance ===
  UPDATE public.profiles
    SET balance = balance - v_total_price,
        total_spent = total_spent + v_total_price,
        total_orders = total_orders + p_quantity
    WHERE user_id = p_user_id;

  -- === Deduct stock (digital only) ===
  IF v_ptype = 'digital' THEN
    UPDATE public.products SET stock = stock - p_quantity WHERE id = p_product_id;
  END IF;

  -- === Determine order status and mode ===
  CASE v_ptype
    WHEN 'digital' THEN
      v_order_status := 'delivered';
      v_order_mode := 'instant';
    WHEN 'imei' THEN
      v_order_status := 'pending';
      v_order_mode := COALESCE(p_fulfillment_mode, 'manual');
    WHEN 'manual' THEN
      v_order_status := 'pending_review';
      v_order_mode := 'manual';
    WHEN 'api' THEN
      v_order_status := 'api_pending';
      v_order_mode := 'api';
    ELSE
      v_order_status := 'pending';
      v_order_mode := 'manual';
  END CASE;

  -- === Create order ===
  INSERT INTO public.orders (
    user_id, product_name, product_id, product_type, credential_id,
    credentials, price, status, fulfillment_mode,
    imei_number, custom_fields_data
  )
  VALUES (
    p_user_id,
    v_product.name || CASE WHEN v_product.duration IS NOT NULL AND v_product.duration != '' AND v_ptype != 'imei'
      THEN ' ' || v_product.duration ELSE '' END
      || CASE WHEN p_quantity > 1 THEN ' (x' || p_quantity || ')' ELSE '' END,
    p_product_id,
    v_ptype,
    CASE WHEN v_ptype = 'digital' THEN v_credential_ids[1] ELSE NULL END,
    array_to_string(v_credentials_list, E'\n'),
    v_total_price,
    v_order_status,
    v_order_mode,
    p_imei_number,
    p_custom_fields
  )
  RETURNING id INTO v_order_id;

  -- === Wallet transaction ===
  INSERT INTO public.wallet_transactions (user_id, type, amount, status, description)
  VALUES (
    p_user_id, 'purchase', v_total_price, 'approved',
    v_product.name || CASE WHEN p_quantity > 1 THEN ' x' || p_quantity ELSE '' END
  );

  -- === Admin notifications for non-instant orders ===
  IF v_order_status != 'delivered' THEN
    SELECT name INTO v_buyer_name FROM public.profiles WHERE user_id = p_user_id;

    v_notif_title := CASE v_ptype
      WHEN 'imei' THEN '📱 IMEI Order Received'
      WHEN 'manual' THEN '🔔 Manual Order Pending'
      WHEN 'api' THEN '🤖 API Order Queued'
      ELSE '🔔 Order Pending'
    END;

    FOR v_admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (
        v_admin.user_id,
        v_notif_title,
        COALESCE(v_buyer_name, 'A reseller') || ' ordered ' || v_product.name
          || CASE WHEN p_quantity > 1 THEN ' (x' || p_quantity || ')' ELSE '' END
          || ' — ' || v_total_price || ' MMK.'
          || CASE WHEN v_ptype = 'imei' THEN ' IMEI: ' || p_imei_number ELSE '' END,
        'order',
        '/admin/orders?order=' || v_order_id::text
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'credentials', array_to_string(v_credentials_list, E'\n'),
    'product_name', v_product.name,
    'product_type', v_ptype,
    'price', v_total_price,
    'quantity', p_quantity,
    'unit_price', v_unit_price
  );
END;
$$;
