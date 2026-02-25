
-- Trigger function: notify admins when a reseller's balance drops below threshold
CREATE OR REPLACE FUNCTION public.notify_admin_low_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_threshold BIGINT := 5000;
  v_admin RECORD;
  v_is_admin BOOLEAN;
BEGIN
  -- Only fire when balance actually decreased below threshold
  IF NEW.balance < v_threshold AND (OLD.balance >= v_threshold) THEN
    -- Skip if this user is an admin themselves
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'admin'
    ) INTO v_is_admin;

    IF v_is_admin THEN
      RETURN NEW;
    END IF;

    FOR v_admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (
        v_admin.user_id,
        '⚠️ Low Reseller Balance',
        COALESCE(NEW.name, NEW.email) || '''s balance dropped to ' || NEW.balance || ' MMK (below ' || v_threshold || ' MMK).',
        'warning',
        '/admin/resellers'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to profiles table
CREATE TRIGGER trg_notify_admin_low_balance
AFTER UPDATE OF balance ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_low_balance();
