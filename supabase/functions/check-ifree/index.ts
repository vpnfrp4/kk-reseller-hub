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
    [/invalid.*(key|api)|auth.*fail|unauthorized|forbidden/i, "API authentication failed. Admin: please verify the iFreeiCloud API key in Settings.", "INVALID_API_KEY"],
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

function randomAlnum(len: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < len; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imei, serviceId, serviceName } = await req.json();
    const API_KEY = Deno.env.get("IFREE_API_KEY");

    if (!API_KEY) return jsonResponse({
      error: "iFreeiCloud API key is not configured. Admin: please add the API key in Settings.",
      error_code: "NO_API_KEY",
    });
    if (!imei || !serviceId) return jsonResponse({ error: "IMEI and Service ID are required", error_code: "MISSING_PARAMS" });

    const cleanImei = String(imei).replace(/\D/g, "").trim();
    if (cleanImei.length !== 15) return jsonResponse({ error: "IMEI must be exactly 15 digits.", error_code: "INVALID_IMEI" });

    const cleanServiceId = String(serviceId).trim();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return jsonResponse({
        error: "Please log in to use the IMEI check service.",
        error_code: "AUTH_REQUIRED",
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      const { data: { user } } = await supabaseUser.auth.getUser(token);
      if (!user) {
        return jsonResponse({
          error: "Your session has expired. Please log in again.",
          error_code: "AUTH_REQUIRED",
        });
      }
      return await processCheck(supabaseAdmin, user.id, cleanImei, cleanServiceId, serviceName, API_KEY);
    }

    const userId = claimsData.claims.sub as string;
    return await processCheck(supabaseAdmin, userId, cleanImei, cleanServiceId, serviceName, API_KEY);
  } catch (err: any) {
    console.error("check-ifree error:", err);
    return jsonResponse({ error: err.message || "Unknown error", error_code: "INTERNAL_ERROR" });
  }
});

async function processCheck(
  supabaseAdmin: any,
  userId: string,
  cleanImei: string,
  cleanServiceId: string,
  serviceName: string,
  API_KEY: string,
) {
  // ── Get selling price from cache (admin-defined) ──
  let sellPrice = 0;
  const { data: cached } = await supabaseAdmin
    .from("ifree_services_cache")
    .select("selling_price, price, markup_price")
    .eq("id", cleanServiceId)
    .single();

  if (cached?.selling_price && cached.selling_price > 0) {
    // Use admin-defined selling price (already in MMK)
    sellPrice = Math.ceil(Number(cached.selling_price));
  } else if (cached?.price) {
    // Fallback: convert provider USD price to MMK if no selling price set
    const { data: rateSetting } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "usd_mmk_rate")
      .single();
    const usdRate = rateSetting?.value?.rate ? Number(rateSetting.value.rate) : 4200;
    sellPrice = Math.ceil(Number(cached.price) * usdRate);
  }

  // Balance pre-check
  if (sellPrice > 0) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("balance")
      .eq("user_id", userId)
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
      data = {
        error: "API authentication failed. Admin: please verify the iFreeiCloud API key in Settings.",
        error_code: "INVALID_API_KEY",
      };
    } else {
      data = { error: "Unexpected response format from provider.", error_code: "INVALID_RESPONSE", raw_preview: rawText.substring(0, 200) };
    }
  }

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

  // ── Deduct balance & create order on success ──
  let orderId: string | null = null;
  if (isSuccess && sellPrice > 0) {
    try {
      await supabaseAdmin.rpc("atomic_balance_add", {
        p_user_id: userId,
        p_amount: -sellPrice,
      });

      const now = new Date();
      const yymm = String(now.getFullYear()).slice(2) + String(now.getMonth() + 1).padStart(2, "0");
      const orderCode = `ORD-${yymm}-${randomAlnum(4)}-IMEI`;

      const { data: orderData, error: orderErr } = await supabaseAdmin
        .from("orders")
        .insert({
          user_id: userId,
          product_name: `IMEI Check: ${serviceName || "Service #" + cleanServiceId}`,
          product_type: "imei",
          credentials: `IMEI: ${cleanImei}`,
          imei_number: cleanImei,
          price: sellPrice,
          status: "delivered",
          fulfillment_mode: "instant",
          order_code: orderCode,
          result: data.response || JSON.stringify(data),
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (orderErr) {
        console.error("Order creation failed:", orderErr.message);
      } else {
        orderId = orderData.id;
      }

      await supabaseAdmin.from("wallet_transactions").insert({
        user_id: userId,
        type: "purchase",
        amount: sellPrice,
        status: "approved",
        description: `IMEI Check: ${serviceName || "Service #" + cleanServiceId}`,
      });

      data.charged = sellPrice;
      data.order_id = orderId;
      console.log(`Charged ${sellPrice} MMK to user ${userId}, order ${orderId}`);
    } catch (chargeErr: any) {
      console.error("Balance deduction failed:", chargeErr.message);
      data.charge_error = "Balance deduction failed. Please contact support.";
    }
  }

  // ── Log the check ──
  try {
    await supabaseAdmin.from("ifree_checks").insert({
      user_id: userId,
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
}
