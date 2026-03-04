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
        JSON.stringify({ error: "API key not configured", error_code: "NO_API_KEY" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!imei || !serviceId) {
      return new Response(
        JSON.stringify({ error: "IMEI and Service ID are required", error_code: "MISSING_PARAMS" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean IMEI: strip whitespace and non-digit chars
    const cleanImei = String(imei).replace(/\D/g, "").trim();
    if (cleanImei.length !== 15) {
      return new Response(
        JSON.stringify({ error: "IMEI must be exactly 15 digits.", error_code: "INVALID_IMEI" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanServiceId = String(serviceId).trim();
    
    const body = new URLSearchParams({
      key: API_KEY,
      imei: cleanImei,
      service: cleanServiceId,
    });

    console.log("check-ifree request:", { imei: cleanImei, serviceId: cleanServiceId });

    const response = await fetch("https://api.ifreeicloud.co.uk", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const rawText = await response.text();
    console.log("check-ifree raw response (first 500):", rawText.substring(0, 500));

    // Try to parse as JSON
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      // Not valid JSON — check if it's an HTML page
      if (rawText.trim().startsWith("<!") || rawText.includes("<html")) {
        data = {
          error: "Provider returned an HTML page instead of data. This usually means the API key is invalid or the session expired.",
          error_code: "HTML_RESPONSE",
        };
      } else {
        data = {
          error: `Unexpected response format from provider.`,
          error_code: "INVALID_RESPONSE",
          raw_preview: rawText.substring(0, 200),
        };
      }
    }

    // Normalize the iFreeiCloud response format
    if (data && typeof data === "object") {
      // iFreeiCloud returns { success: true/false, response: "...", error: "...", account_balance: "..." }
      
      // Case: success is true but response is empty/null → "Processing"
      if (data.success === true && !data.response && !data.error) {
        data.status = "processing";
        data.response = "⏳ Your request is being processed. Please check back shortly.";
      }
      
      // Case: success is false with a message
      if (data.success === false && !data.error) {
        data.error = data.message || data.msg || "The provider returned an error. Please try again.";
      }

      // Enrich specific error messages
      if (data.error) {
        const errorLower = String(data.error).toLowerCase();
        
        if (errorLower.includes("service doesn") || errorLower.includes("not exist") || errorLower.includes("invalid service")) {
          data.error = "This service ID no longer exists at the provider. Please refresh the service list and select a valid service.";
          data.error_code = "SERVICE_NOT_FOUND";
        } else if (errorLower.includes("insufficient") || errorLower.includes("balance") || errorLower.includes("credit") || errorLower.includes("not enough")) {
          data.error = "Insufficient API balance at the provider. Please contact admin to top up the iFreeiCloud account.";
          data.error_code = "INSUFFICIENT_BALANCE";
        } else if (errorLower.includes("invalid") && (errorLower.includes("key") || errorLower.includes("api"))) {
          data.error = "Invalid API key. Please verify the iFreeiCloud API key configuration.";
          data.error_code = "INVALID_API_KEY";
        } else if (errorLower.includes("invalid") && errorLower.includes("imei")) {
          data.error = "The provider rejected this IMEI number. Please verify it is correct.";
          data.error_code = "INVALID_IMEI";
        } else if (errorLower.includes("maintenance") || errorLower.includes("unavailable") || errorLower.includes("down")) {
          data.error = "This service is currently under maintenance. Please try again later.";
          data.error_code = "MAINTENANCE";
        } else if (errorLower.includes("slow") || errorLower.includes("queue") || errorLower.includes("wait")) {
          data.error = "This service is experiencing delays. Your request has been queued — please check back in a few minutes.";
          data.error_code = "SLOW_SERVICE";
        } else if (!data.error_code) {
          data.error_code = "PROVIDER_ERROR";
        }
      }
    }

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
            imei: cleanImei,
            service_id: cleanServiceId,
            service_name: serviceName || "",
            response_text: data.response || null,
            account_balance: data.account_balance != null ? String(data.account_balance) : null,
            error_message: data.error || null,
            success: data.success === true && !data.error,
          });
        }
      }
    } catch (logErr) {
      console.error("Failed to log ifree check:", logErr);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Unknown error", error_code: "INTERNAL_ERROR" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
