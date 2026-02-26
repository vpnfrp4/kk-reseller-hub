
-- Attach the existing trigger functions to system_settings
CREATE TRIGGER on_usd_rate_change
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.on_usd_rate_change();

CREATE TRIGGER log_rate_change
  AFTER UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_rate_change();
