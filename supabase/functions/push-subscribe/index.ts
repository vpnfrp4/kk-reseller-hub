import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getOrCreateVapidKeys(supabaseAdmin: ReturnType<typeof createClient>) {
  const { data } = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", "vapid_keys")
    .single();

  if (data?.value?.publicKey && data?.value?.privateKey) {
    return data.value as { publicKey: string; privateKey: string };
  }

  const keys = webpush.generateVAPIDKeys();
  await supabaseAdmin.from("system_settings").upsert(
    {
      key: "vapid_keys",
      value: { publicKey: keys.publicKey, privateKey: keys.privateKey },
    },
    { onConflict: "key" }
  );

  return { publicKey: keys.publicKey, privateKey: keys.privateKey };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userId = claimsData.claims.sub as string;
    const body = await req.json().catch(() => ({}));
    const action = body.action || "get-vapid-key";

    switch (action) {
      case "get-vapid-key": {
        const keys = await getOrCreateVapidKeys(supabaseAdmin);
        return json({ publicKey: keys.publicKey });
      }

      case "subscribe": {
        const sub = body.subscription;
        if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
          return json({ error: "Invalid subscription object" }, 400);
        }

        const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
          {
            user_id: userId,
            endpoint: sub.endpoint,
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
          { onConflict: "user_id,endpoint" }
        );

        if (error) {
          console.error("Subscribe error:", error);
          return json({ error: error.message }, 500);
        }
        return json({ success: true });
      }

      case "unsubscribe": {
        const endpoint = body.endpoint;
        if (!endpoint) {
          return json({ error: "Missing endpoint" }, 400);
        }

        await supabaseAdmin
          .from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("endpoint", endpoint);

        return json({ success: true });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("push-subscribe error:", err);
    return json({ error: message }, 500);
  }
});
