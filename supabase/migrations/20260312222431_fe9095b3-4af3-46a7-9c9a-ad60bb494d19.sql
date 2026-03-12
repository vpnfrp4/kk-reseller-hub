
-- Create the auto-approve trigger function
CREATE OR REPLACE FUNCTION public.auto_approve_topup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_settings JSONB;
  v_enabled BOOLEAN;
  v_threshold BIGINT;
BEGIN
  -- Only process new pending topups
  IF NEW.type != 'topup' OR NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Read auto-approve settings
  SELECT value INTO v_settings
  FROM public.system_settings
  WHERE key = 'auto_approve_topup';

  IF v_settings IS NULL THEN
    RETURN NEW;
  END IF;

  v_enabled := COALESCE((v_settings->>'enabled')::boolean, false);
  v_threshold := COALESCE((v_settings->>'threshold')::bigint, 0);

  -- Check if auto-approve conditions are met
  IF v_enabled AND NEW.amount <= v_threshold AND v_threshold > 0 THEN
    -- Auto-approve: update status
    NEW.status := 'approved';

    -- Credit the user's balance atomically
    UPDATE public.profiles
    SET balance = balance + NEW.amount
    WHERE user_id = NEW.user_id;

    -- Create notification for the user
    INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (
      NEW.user_id,
      'Top-Up Auto-Approved! 🎉',
      NEW.amount || ' MMK has been automatically credited to your wallet.',
      'success'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger on wallet_transactions
DROP TRIGGER IF EXISTS trg_auto_approve_topup ON public.wallet_transactions;
CREATE TRIGGER trg_auto_approve_topup
  BEFORE INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_approve_topup();
