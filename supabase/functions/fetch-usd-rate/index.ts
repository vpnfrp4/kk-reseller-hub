import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get current setting
    const { data: setting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "usd_mmk_rate")
      .single();

    const currentValue = (setting?.value as Record<string, unknown>) || {};
    const oldRate = Number(currentValue.rate) || 0;
    const autoFetch = currentValue.auto_fetch ?? true;

    // Check if this is a scheduled call (not manual) and auto_fetch is disabled
    let isManual = false;
    try {
      const url = new URL(req.url);
      isManual = url.searchParams.get("manual") === "true";
    } catch { /* ignore */ }
    if (!isManual && req.method === "POST") {
      try {
        const body = await req.json();
        isManual = body?.manual === true;
      } catch { /* ignore */ }
    }

    if (!isManual && !autoFetch) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "auto_fetch disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch live rate
    const apiRes = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!apiRes.ok) {
      throw new Error(`API returned ${apiRes.status}`);
    }

    const apiData = await apiRes.json();
    const newRate = apiData?.rates?.MMK;

    if (typeof newRate !== "number" || newRate < 500 || newRate > 50000) {
      return new Response(
        JSON.stringify({
          skipped: true,
          reason: "Rate out of reasonable range",
          fetched_rate: newRate,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Round to integer
    const roundedRate = Math.round(newRate);

    // Skip if unchanged
    if (roundedRate === oldRate && !isManual) {
      return new Response(
        JSON.stringify({
          skipped: true,
          reason: "Rate unchanged",
          rate: roundedRate,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update system_settings — this triggers on_usd_rate_change → recalculate_usd_prices
    const newValue = {
      ...currentValue,
      rate: roundedRate,
      source: "er-api",
      fetched_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("system_settings")
      .update({ value: newValue })
      .eq("key", "usd_mmk_rate");

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        old_rate: oldRate,
        new_rate: roundedRate,
        prices_recalculated: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("fetch-usd-rate error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
