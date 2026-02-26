
-- Create rate history table
CREATE TABLE public.rate_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rate NUMERIC NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rate_history ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "Authenticated users can read rate history"
  ON public.rate_history FOR SELECT USING (true);

-- Only admins can insert/delete
CREATE POLICY "Admins can manage rate history"
  ON public.rate_history FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to auto-log rate changes
CREATE OR REPLACE FUNCTION public.log_rate_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_new_rate NUMERIC;
  v_source TEXT;
BEGIN
  IF NEW.key = 'usd_mmk_rate' THEN
    v_new_rate := (NEW.value->>'rate')::numeric;
    v_source := COALESCE(NEW.value->>'source', 'manual');
    IF v_new_rate IS NOT NULL AND v_new_rate > 0 THEN
      INSERT INTO public.rate_history (rate, source) VALUES (v_new_rate, v_source);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_log_rate_change
  AFTER UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_rate_change();

-- Seed with current rate
INSERT INTO public.rate_history (rate, source, created_at)
SELECT (value->>'rate')::numeric, COALESCE(value->>'source', 'manual'), updated_at
FROM public.system_settings WHERE key = 'usd_mmk_rate';
