
-- Safeguard: prevent DELETE and TRUNCATE on products table
-- Only allow deletes from admin sessions (via RLS), never from service_role bulk operations
CREATE OR REPLACE FUNCTION public.prevent_product_deletion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $fn$
BEGIN
  -- Allow single-row admin deletes (RLS-protected), block bulk/sync deletes
  -- If current_setting is set by sync functions, block the delete
  IF current_setting('app.sync_in_progress', true) = 'true' THEN
    RAISE EXCEPTION 'DELETE on products is blocked during sync operations';
  END IF;
  RETURN OLD;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_prevent_product_deletion ON public.products;
CREATE TRIGGER trg_prevent_product_deletion
BEFORE DELETE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.prevent_product_deletion();

-- Also add a safeguard trigger to prevent TRUNCATE
CREATE OR REPLACE FUNCTION public.prevent_product_truncate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $fn$
BEGIN
  RAISE EXCEPTION 'TRUNCATE on products table is not allowed';
  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_prevent_product_truncate ON public.products;
CREATE TRIGGER trg_prevent_product_truncate
BEFORE TRUNCATE ON public.products
FOR EACH STATEMENT
EXECUTE FUNCTION public.prevent_product_truncate();
