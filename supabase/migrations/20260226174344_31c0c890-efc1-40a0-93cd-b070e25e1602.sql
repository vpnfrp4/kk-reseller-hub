
-- ============================================================
-- 1. PRODUCT CODE: PRD-{YEAR}-{6 digit sequence}
-- ============================================================

-- Add column
ALTER TABLE public.products ADD COLUMN product_code TEXT;

-- Create sequence for products (yearly reset handled in trigger)
CREATE SEQUENCE IF NOT EXISTS public.product_code_seq START 1;

-- Function to generate product_code
CREATE OR REPLACE FUNCTION public.generate_product_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_year TEXT;
  v_seq INT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  v_seq := nextval('public.product_code_seq');
  NEW.product_code := 'PRD-' || v_year || '-' || lpad(v_seq::text, 6, '0');
  RETURN NEW;
END;
$$;

-- Trigger
CREATE TRIGGER trg_generate_product_code
  BEFORE INSERT ON public.products
  FOR EACH ROW
  WHEN (NEW.product_code IS NULL)
  EXECUTE FUNCTION public.generate_product_code();

-- Unique index
CREATE UNIQUE INDEX idx_products_product_code ON public.products (product_code);

-- Backfill existing products
UPDATE public.products
SET product_code = 'PRD-' || to_char(created_at, 'YYYY') || '-' || lpad(row_number::text, 6, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS row_number
  FROM public.products
) sub
WHERE products.id = sub.id AND products.product_code IS NULL;

-- Now make NOT NULL
ALTER TABLE public.products ALTER COLUMN product_code SET NOT NULL;

-- ============================================================
-- 2. ORDER CODE: ORD-{YYMM}-{4 random chars}-{4 digit sequence}
-- ============================================================

-- Add column
ALTER TABLE public.orders ADD COLUMN order_code TEXT;

-- Sequence for orders
CREATE SEQUENCE IF NOT EXISTS public.order_code_seq START 1;

-- Helper: generate 4 random alphanumeric chars
CREATE OR REPLACE FUNCTION public.random_alnum4()
RETURNS TEXT
LANGUAGE sql
SET search_path TO 'public'
AS $$
  SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', ceil(random()*31)::int, 1), '')
  FROM generate_series(1,4);
$$;

-- Function to generate order_code
CREATE OR REPLACE FUNCTION public.generate_order_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_yymm TEXT;
  v_seq INT;
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  v_yymm := to_char(now(), 'YYMM');
  v_seq := nextval('public.order_code_seq');

  -- Loop until unique (collision with random part is extremely unlikely)
  LOOP
    v_code := 'ORD-' || v_yymm || '-' || public.random_alnum4() || '-' || lpad(v_seq::text, 4, '0');
    SELECT EXISTS(SELECT 1 FROM public.orders WHERE order_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
    v_seq := nextval('public.order_code_seq');
  END LOOP;

  NEW.order_code := v_code;
  RETURN NEW;
END;
$$;

-- Trigger
CREATE TRIGGER trg_generate_order_code
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  WHEN (NEW.order_code IS NULL)
  EXECUTE FUNCTION public.generate_order_code();

-- Unique index
CREATE UNIQUE INDEX idx_orders_order_code ON public.orders (order_code);

-- Backfill existing orders
UPDATE public.orders
SET order_code = 'ORD-' || to_char(created_at, 'YYMM') || '-' || public.random_alnum4() || '-' || lpad(row_number::text, 4, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS row_number
  FROM public.orders
) sub
WHERE orders.id = sub.id AND orders.order_code IS NULL;

-- Make NOT NULL
ALTER TABLE public.orders ALTER COLUMN order_code SET NOT NULL;
