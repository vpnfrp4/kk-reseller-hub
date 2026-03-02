
-- 1. Add slug column
ALTER TABLE public.products ADD COLUMN slug text;

-- 2. Create slug generation trigger function
CREATE OR REPLACE FUNCTION public.generate_product_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $fn$
DECLARE
  v_base_slug TEXT;
  v_slug TEXT;
  v_suffix INT := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    v_base_slug := lower(regexp_replace(
      regexp_replace(NEW.name, '[^\w\s-]', '', 'g'),
      '[\s_]+', '-', 'g'
    ));
    v_base_slug := trim(both '-' from v_base_slug);
    v_base_slug := left(v_base_slug, 80);
    IF v_base_slug = '' OR v_base_slug IS NULL THEN
      v_base_slug := lower(replace(NEW.product_code, ' ', '-'));
    END IF;
    v_slug := v_base_slug;
    WHILE EXISTS (SELECT 1 FROM public.products WHERE slug = v_slug AND id != NEW.id) LOOP
      v_suffix := v_suffix + 1;
      v_slug := v_base_slug || '-' || v_suffix;
    END LOOP;
    NEW.slug := v_slug;
  END IF;
  RETURN NEW;
END;
$fn$;

-- 3. Attach trigger
DROP TRIGGER IF EXISTS trg_generate_product_slug ON public.products;
CREATE TRIGGER trg_generate_product_slug
BEFORE INSERT OR UPDATE OF name ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.generate_product_slug();

-- 4. Backfill slugs for existing products
DO $do$
DECLARE
  r RECORD;
  v_base TEXT;
  v_slug TEXT;
  v_suf INT;
BEGIN
  FOR r IN SELECT id, name, product_code FROM public.products WHERE slug IS NULL ORDER BY created_at LOOP
    v_base := lower(regexp_replace(regexp_replace(r.name, '[^\w\s-]', '', 'g'), '[\s_]+', '-', 'g'));
    v_base := trim(both '-' from v_base);
    v_base := left(v_base, 80);
    IF v_base = '' OR v_base IS NULL THEN
      v_base := lower(replace(r.product_code, ' ', '-'));
    END IF;
    v_slug := v_base;
    v_suf := 0;
    WHILE EXISTS (SELECT 1 FROM public.products WHERE slug = v_slug AND id != r.id) LOOP
      v_suf := v_suf + 1;
      v_slug := v_base || '-' || v_suf;
    END LOOP;
    UPDATE public.products SET slug = v_slug WHERE id = r.id;
  END LOOP;
END;
$do$;

-- 5. Unique index
CREATE UNIQUE INDEX idx_products_slug ON public.products (slug);
