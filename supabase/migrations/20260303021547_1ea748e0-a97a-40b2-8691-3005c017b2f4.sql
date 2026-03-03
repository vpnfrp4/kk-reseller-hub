
-- Add telegram_link_token column for bot linking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS telegram_link_token text UNIQUE;

-- Create function to notify admin via Telegram on new user registration
CREATE OR REPLACE FUNCTION public.notify_admin_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Fire Telegram notification via HTTP to send-telegram edge function
  PERFORM net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1) || '/functions/v1/send-telegram',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY' LIMIT 1)
    ),
    body := jsonb_build_object(
      'type', 'custom',
      'message', '👤 <b>New Reseller Registered!</b>' || chr(10) ||
        '━━━━━━━━━━━━━━━━━━' || chr(10) ||
        '📧 <b>Email:</b> ' || NEW.email || chr(10) ||
        '👤 <b>Name:</b> ' || COALESCE(NULLIF(NEW.name, ''), 'Not set') || chr(10) ||
        '📅 <b>Date:</b> ' || to_char(now(), 'YYYY-MM-DD HH24:MI') || chr(10) ||
        '━━━━━━━━━━━━━━━━━━' || chr(10) ||
        '🔗 <a href="https://kk-reseller-hub.lovable.app/admin/resellers">Manage Resellers</a>'
    )
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_new_user_telegram ON public.profiles;
CREATE TRIGGER on_new_user_telegram
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_user();
