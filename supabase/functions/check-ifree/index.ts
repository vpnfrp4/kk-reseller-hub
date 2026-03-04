import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imei, serviceId, serviceName } = await req.json();
    const API_KEY = Deno.env.get("IFREE_API_KEY");

    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!imei || !serviceId) {
      return new Response(
        JSON.stringify({ error: "imei and serviceId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = new URLSearchParams({
      key: API_KEY,
      imei,
      service: serviceId,
    });

    const response = await fetch("https://api.ifreeicloud.co.uk", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = await response.json();

    // Log the check to database
    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("ifree_checks").insert({
            user_id: user.id,
            imei,
            service_id: serviceId,
            service_name: serviceName || "",
            response_text: data.response || null,
            account_balance: data.account_balance != null ? String(data.account_balance) : null,
            error_message: data.error || null,
            success: !data.error,
          });
        }
      }
    } catch (logErr) {
      // Don't fail the request if logging fails
      console.error("Failed to log ifree check:", logErr);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
