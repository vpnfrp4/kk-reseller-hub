
-- Drop existing triggers
DROP TRIGGER IF EXISTS on_usd_rate_change ON public.system_settings;
DROP TRIGGER IF EXISTS log_rate_change ON public.system_settings;

-- Recreate on_usd_rate_change as AFTER trigger so recalculate can read the new rate
CREATE OR REPLACE FUNCTION public.on_usd_rate_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.key = 'usd_mmk_rate' THEN
    PERFORM public.recalculate_usd_prices();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_usd_rate_change
  AFTER UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.on_usd_rate_change();

CREATE TRIGGER log_rate_change
  AFTER UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_rate_change();
