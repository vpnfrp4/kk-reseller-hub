
-- ═══════════════════════════════════════════════════════════
-- SMM PRICING ENGINE: Schema + RPC Updates
-- ═══════════════════════════════════════════════════════════

-- 1. Add profit tracking columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS provider_cost bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profit_amount bigint DEFAULT 0;

-- 2. Add category_margins to system_settings (global + per-category margin)
INSERT INTO public.system_settings (key, value)
VALUES ('margin_config', '{"global_margin": 20, "category_margins": {}}')
ON CONFLICT (key) DO NOTHING;

-- 3. Update process_purchase to handle per-1000 API pricing with exchange conversion
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
AS $function$
DECLARE
  v_product RECORD;
  v_unit_price BIGINT;
  v_total_price BIGINT;
  v_provider_cost BIGINT := 0;
  v_profit BIGINT := 0;
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
  v_usd_rate NUMERIC;
  v_margin NUMERIC;
  v_category_margins JSONB;
  v_global_margin NUMERIC;
BEGIN
  -- Validate quantity
  IF p_quantity < 1 OR p_quantity > 1000000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid quantity');
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

  -- === API product pricing: per-1000 rate with exchange conversion ===
  IF v_ptype = 'api' AND v_product.api_rate IS NOT NULL THEN
    -- Get USD/MMK exchange rate
    SELECT (value->>'rate')::numeric INTO v_usd_rate
    FROM public.system_settings WHERE key = 'usd_mmk_rate';

    IF v_usd_rate IS NULL OR v_usd_rate <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Exchange rate not configured');
    END IF;

    -- Get effective margin: service > category > global
    v_margin := v_product.margin_percent;

    IF v_margin IS NULL OR v_margin <= 0 THEN
      -- Try category-level margin
      SELECT value->'category_margins' INTO v_category_margins
      FROM public.system_settings WHERE key = 'margin_config';

      IF v_category_margins IS NOT NULL AND v_category_margins ? v_product.category THEN
        v_margin := (v_category_margins->>v_product.category)::numeric;
      END IF;
    END IF;

    IF v_margin IS NULL OR v_margin <= 0 THEN
      -- Global margin fallback
      SELECT (value->>'global_margin')::numeric INTO v_global_margin
      FROM public.system_settings WHERE key = 'margin_config';
      v_margin := COALESCE(v_global_margin, 20);
    END IF;

    -- Calculate: rate is per 1000 units in USD
    -- unit_cost_usd = api_rate / 1000
    -- unit_cost_mmk = unit_cost_usd * exchange_rate
    -- unit_price = unit_cost_mmk * (1 + margin / 100)
    -- total = unit_price * quantity (ceil)
    v_unit_price := ceil((v_product.api_rate / 1000.0) * v_usd_rate * (1 + v_margin / 100.0));
    v_total_price := v_unit_price * p_quantity;

    -- Provider cost (no margin)
    v_provider_cost := ceil((v_product.api_rate / 1000.0) * v_usd_rate) * p_quantity;
    v_profit := v_total_price - v_provider_cost;

  ELSE
    -- === Standard pricing for non-API products ===
    IF v_ptype = 'imei' THEN
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

    -- For non-API products with provider_price, track profit
    IF v_product.provider_price IS NOT NULL AND v_product.provider_price > 0 THEN
      v_provider_cost := v_product.provider_price * p_quantity;
      v_profit := v_total_price - v_provider_cost;
    END IF;
  END IF;

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
        total_orders = total_orders + CASE WHEN v_ptype = 'api' THEN 1 ELSE p_quantity END
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

  -- === Create order with profit tracking ===
  INSERT INTO public.orders (
    user_id, product_name, product_id, product_type, credential_id,
    credentials, price, status, fulfillment_mode,
    imei_number, custom_fields_data,
    provider_cost, profit_amount
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
    p_custom_fields,
    v_provider_cost,
    v_profit
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
      WHEN 'imei' THEN 'IMEI Order Received'
      WHEN 'manual' THEN 'Manual Order Pending'
      WHEN 'api' THEN 'API Order Queued'
      ELSE 'Order Pending'
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
    'unit_price', v_unit_price,
    'provider_cost', v_provider_cost,
    'profit', v_profit
  );
END;
$function$;
