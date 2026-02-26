
-- Drop the old process_imei_purchase function
DROP FUNCTION IF EXISTS public.process_imei_purchase(uuid, uuid, text);

-- Drop the sync trigger on imei_services
DROP TRIGGER IF EXISTS trg_sync_imei_final_price ON public.imei_services;
DROP FUNCTION IF EXISTS public.sync_imei_final_price();

-- Drop imei_orders (references imei_services)
DROP TABLE IF EXISTS public.imei_orders;

-- Drop imei_services (references brands/countries/carriers/providers)
DROP TABLE IF EXISTS public.imei_services;
