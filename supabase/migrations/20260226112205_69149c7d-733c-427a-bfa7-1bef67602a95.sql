
-- Sync existing rows: set price = final_price where final_price > 0
UPDATE public.imei_services SET price = final_price WHERE final_price > 0 AND price != final_price;

-- Create trigger to auto-sync price = final_price on insert/update
CREATE OR REPLACE FUNCTION public.sync_imei_final_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.final_price > 0 THEN
    NEW.price := NEW.final_price;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_imei_final_price
BEFORE INSERT OR UPDATE ON public.imei_services
FOR EACH ROW
EXECUTE FUNCTION public.sync_imei_final_price();
