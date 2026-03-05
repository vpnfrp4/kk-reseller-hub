import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, title, body, link, type } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get VAPID keys from system_settings
    const { data: vapidData } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "vapid_keys")
      .single();

    if (!vapidData?.value?.publicKey || !vapidData?.value?.privateKey) {
      console.log("VAPID keys not configured yet – skipping push");
      return new Response(JSON.stringify({ sent: 0, reason: "no_vapid_keys" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    webpush.setVapidDetails(
      "mailto:admin@karkar4.store",
      vapidData.value.publicKey,
      vapidData.value.privateKey
    );

    // Get user's push subscriptions
    const { data: subscriptions } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (!subscriptions?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build notification payload
    const payload = JSON.stringify({
      title: title || "KKREMOTER",
      body: body || "You have a new notification",
      link: link || "/dashboard",
      type: type || "info",
      tag: `kk-${type || "info"}-${Date.now()}`,
    });

    let sent = 0;
    const expired: string[] = [];

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        sent++;
      } catch (err: any) {
        // 404 or 410 means subscription expired
        if (err.statusCode === 404 || err.statusCode === 410) {
          expired.push(sub.id);
        }
        console.error(
          "Push failed:",
          sub.endpoint.slice(0, 60),
          err.statusCode || err.message
        );
      }
    }

    // Clean up expired subscriptions
    if (expired.length > 0) {
      await supabaseAdmin
        .from("push_subscriptions")
        .delete()
        .in("id", expired);
    }

    return new Response(
      JSON.stringify({ sent, expired: expired.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("send-push-notification error:", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
