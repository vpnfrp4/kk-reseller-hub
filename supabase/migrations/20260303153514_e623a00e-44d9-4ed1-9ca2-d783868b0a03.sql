
CREATE OR REPLACE FUNCTION public.notify_admin_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_url TEXT;
  v_anon_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  SELECT decrypted_secret INTO v_anon_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY' LIMIT 1;

  IF v_url IS NULL OR v_anon_key IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_url || '/functions/v1/send-telegram',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
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
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;
