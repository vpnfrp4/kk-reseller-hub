import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function enrichError(data: any) {
  if (!data.error) return;
  const lower = String(data.error).toLowerCase();

  const patterns: [RegExp, string, string][] = [
    [/service doesn|not exist|invalid service/i, "This service ID no longer exists at the provider. Please refresh the service list.", "SERVICE_NOT_FOUND"],
    [/insufficient|balance|credit|not enough/i, "Insufficient API balance at the provider. Please contact admin.", "INSUFFICIENT_BALANCE"],
    [/invalid.*(key|api)/i, "Invalid API key. Please verify the iFreeiCloud API key configuration.", "INVALID_API_KEY"],
    [/invalid.*imei/i, "The provider rejected this IMEI number.", "INVALID_IMEI"],
    [/maintenance|unavailable|down/i, "This service is under maintenance. Please try again later.", "MAINTENANCE"],
    [/slow|queue|wait/i, "Service experiencing delays. Your request has been queued.", "SLOW_SERVICE"],
  ];

  for (const [re, msg, code] of patterns) {
    if (re.test(lower)) {
      data.error = msg;
      data.error_code = code;
      return;
    }
  }
  if (!data.error_code) data.error_code = "PROVIDER_ERROR";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imei, serviceId, serviceName, servicePrice } = await req.json();
    const API_KEY = Deno.env.get("IFREE_API_KEY");

    if (!API_KEY) return jsonResponse({ error: "API key not configured", error_code: "NO_API_KEY" });
    if (!imei || !serviceId) return jsonResponse({ error: "IMEI and Service ID are required", error_code: "MISSING_PARAMS" });

    const cleanImei = String(imei).replace(/\D/g, "").trim();
    if (cleanImei.length !== 15) return jsonResponse({ error: "IMEI must be exactly 15 digits.", error_code: "INVALID_IMEI" });

    const cleanServiceId = String(serviceId).trim();

    // ── Auth & balance pre-check ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authentication required", error_code: "AUTH_REQUIRED" });

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user } } = await supabaseUser.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return jsonResponse({ error: "Invalid session", error_code: "AUTH_REQUIRED" });

    // Determine sell price (MMK) — from servicePrice param or cache
    let sellPrice = 0;
    if (servicePrice && Number(servicePrice) > 0) {
      sellPrice = Math.ceil(Number(servicePrice));
    } else {
      // Try to get price from cache table
      const { data: cached } = await supabaseAdmin
        .from("ifree_services_cache")
        .select("price")
        .eq("id", cleanServiceId)
        .single();
      if (cached?.price) {
        // cached price is in USD string, convert to MMK
        const { data: rateSetting } = await supabaseAdmin
          .from("system_settings")
          .select("value")
          .eq("key", "usd_mmk_rate")
          .single();
        const usdRate = rateSetting?.value?.rate ? Number(rateSetting.value.rate) : 4200;
        sellPrice = Math.ceil(Number(cached.price) * usdRate);
      }
    }

    // Balance pre-check
    if (sellPrice > 0) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      if (!profile || profile.balance < sellPrice) {
        return jsonResponse({
          error: `Insufficient balance. This check costs ${sellPrice.toLocaleString()} MMK. Please top up your wallet.`,
          error_code: "USER_INSUFFICIENT_BALANCE",
          required: sellPrice,
          current_balance: profile?.balance ?? 0,
        });
      }
    }

    // ── Call iFreeiCloud API ──
    console.log("check-ifree request:", { imei: cleanImei, serviceId: cleanServiceId, sellPrice });

    const body = new URLSearchParams({ key: API_KEY, imei: cleanImei, service: cleanServiceId });
    const response = await fetch("https://api.ifreeicloud.co.uk", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const rawText = await response.text();
    console.log("check-ifree raw (first 500):", rawText.substring(0, 500));

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      if (rawText.trim().startsWith("<!") || rawText.includes("<html")) {
        data = { error: "Provider returned HTML instead of data. API key may be invalid.", error_code: "HTML_RESPONSE" };
      } else {
        data = { error: "Unexpected response format from provider.", error_code: "INVALID_RESPONSE", raw_preview: rawText.substring(0, 200) };
      }
    }

    // Normalize response
    if (data && typeof data === "object") {
      if (data.success === true && !data.response && !data.error) {
        data.status = "processing";
        data.response = "⏳ Your request is being processed. Please check back shortly.";
      }
      if (data.success === false && !data.error) {
        data.error = data.message || data.msg || "The provider returned an error.";
      }
      enrichError(data);
    }

    const isSuccess = data.success === true && !data.error;

    // ── Deduct balance on success ──
    if (isSuccess && sellPrice > 0) {
      try {
        // Atomic deduction
        await supabaseAdmin.rpc("atomic_balance_add", {
          p_user_id: user.id,
          p_amount: -sellPrice,
        });

        // Log wallet transaction
        await supabaseAdmin.from("wallet_transactions").insert({
          user_id: user.id,
          type: "purchase",
          amount: sellPrice,
          status: "approved",
          description: `IMEI Check: ${serviceName || "Service #" + cleanServiceId}`,
        });

        data.charged = sellPrice;
        console.log(`Charged ${sellPrice} MMK to user ${user.id}`);
      } catch (chargeErr: any) {
        console.error("Balance deduction failed:", chargeErr.message);
        // Don't fail the whole request — user still gets results but log the issue
        data.charge_error = "Balance deduction failed. Please contact support.";
      }
    }

    // ── Log the check ──
    try {
      await supabaseUser.from("ifree_checks").insert({
        user_id: user.id,
        imei: cleanImei,
        service_id: cleanServiceId,
        service_name: serviceName || "",
        response_text: data.response || null,
        account_balance: data.account_balance != null ? String(data.account_balance) : null,
        error_message: data.error || null,
        success: isSuccess,
      });
    } catch (logErr: any) {
      console.error("Failed to log ifree check:", logErr.message);
    }

    return jsonResponse(data);
  } catch (err: any) {
    return jsonResponse({ error: err.message || "Unknown error", error_code: "INTERNAL_ERROR" });
  }
});
